import type { Database } from "better-sqlite3";

/** 条目 → 引用媒体 的派生索引表（entry_media_refs）维护逻辑。
 *
 *  为什么需要它：访客判断「这张图能不能看」原来靠
 *  `ref_media LIKE '%<id>%' OR layout LIKE '%<id>%'` 全表扫描，
 *  条目一多每次图片请求都扫一遍。这里把引用关系抽成 (media_id, entry_id)
 *  的点查表，判断可见性变成一次索引命中。
 *
 *  只依赖 better-sqlite3 的类型（type-only import），所以 db.ts 可以安全地
 *  在建库时调用 rebuildEntryRefs，不会跟 entries.ts 形成循环依赖。
 *  表结构见 db.ts 的 SCHEMA；entries 增删改由 entries.ts 调 syncEntryRefs 同步。 */

const ID_RE = /^[a-f0-9]{8,16}$/;

/** 一个条目引用到的全部媒体 id（ref_media 引用列表 + 自由拼贴 layout 里的 image 元素），去重保序 */
export function entryRefIds(refMedia: string | null, layout: string | null): string[] {
  const ids: string[] = [];
  const push = (id: unknown) => {
    if (typeof id === "string" && ID_RE.test(id) && !ids.includes(id)) ids.push(id);
  };
  if (refMedia) {
    try {
      const parsed: unknown = JSON.parse(refMedia);
      if (Array.isArray(parsed)) for (const it of parsed) push((it as { id?: unknown } | null)?.id);
    } catch {
      /* 坏 JSON 当没有引用 */
    }
  }
  if (layout) {
    try {
      const parsed: unknown = JSON.parse(layout);
      const els = (parsed as { elements?: unknown } | null)?.elements;
      if (Array.isArray(els)) {
        for (const el of els) push((el as { media?: unknown } | null)?.media);
      }
    } catch {
      /* 坏 JSON 当没有引用 */
    }
  }
  return ids;
}

/** 同步单个条目的引用行（先删后插）：createEntry / updateEntry 后调用 */
export function syncEntryRefs(d: Database, entryId: string, refMedia: string | null, layout: string | null): void {
  d.prepare("DELETE FROM entry_media_refs WHERE entry_id = ?").run(entryId);
  const insert = d.prepare("INSERT OR IGNORE INTO entry_media_refs (media_id, entry_id) VALUES (?, ?)");
  for (const mediaId of entryRefIds(refMedia, layout)) insert.run(mediaId, entryId);
}

/** 启动时全量重建（幂等，以 entries 现状为准）：兜住任何漏同步的写入路径，
 *  也让老库/seed 直接写出来的数据一次补齐。个人手账规模，建库时跑一遍开销可忽略 */
export function rebuildEntryRefs(d: Database): void {
  const rows = d.prepare("SELECT id, ref_media, layout FROM entries").all() as {
    id: string;
    ref_media: string | null;
    layout: string | null;
  }[];
  const insert = d.prepare("INSERT OR IGNORE INTO entry_media_refs (media_id, entry_id) VALUES (?, ?)");
  const rebuildAll = d.transaction((list: typeof rows) => {
    // 删+插放同一个事务：重建窗口期读者不会看到空引用表
    d.exec("DELETE FROM entry_media_refs");
    for (const r of list) {
      for (const mediaId of entryRefIds(r.ref_media, r.layout)) insert.run(mediaId, r.id);
    }
  });
  rebuildAll(rows);
}
