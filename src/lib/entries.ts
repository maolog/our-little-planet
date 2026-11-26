import { db, type EntryRow, type MediaRow } from "./db";
import { syncEntryRefs } from "./entryRefs";
import { newId, nowISO, todayLocal } from "./ids";
import { deleteMediaFile, getMediaById, publicMedia } from "./media";
import { parseBoardLayout, sanitizeBoardLayout, type BoardLayout } from "./board";
import { parseTags, sanitizeTags } from "./tags";
import { upsertTags } from "./tagStore";

export type EntryType = "journal" | "photo" | "quote" | "letter" | "board";

export type EntryInput = {
  type: EntryType;
  title?: string;
  body: string;
  speaker?: string;
  mood?: string;
  entryDate: string; // YYYY-MM-DD
  /** 定时可见日期（定时信用），当天起对读者可见 */
  revealAt?: string;
  media?: { id: string; caption?: string; sort?: number; liveVideoId?: string | null }[];
  /** 引用的相册照片/视频（手账页「从本子里选」）：只挂引用不动 entry_id，可写自己的描述 */
  refMedia?: { id: string; caption?: string; sort?: number }[];
  /** 编辑时要解除并删除的旧照片 */
  removeMediaIds?: string[];
  /** 自由拼贴页（board）的元素布局，服务端清洗后存 entries.layout */
  layout?: unknown;
  /** 相册标签（「青海之行」这类）：存照片/手账页可贴，相册墙按它筛选 */
  tags?: string[];
  /** 访客模式：public = 不登录也能看；缺省 private = 仅她（输密码）可见 */
  visibility?: "public" | "private";
  /** 发布者：缺省 author（他，作者口令）；她用读者密码发布时传 reader */
  createdBy?: "author" | "reader";
};

export type PublicMedia = {
  id: string;
  url: string;
  /** 照片墙用的 480px WebP 缩略图（没有时回落原图） */
  thumbUrl: string | null;
  /** 视频封面（ffmpeg 抽的第一帧 480px JPG）：HEVC 解不出首帧的浏览器也看得到 */
  posterUrl: string | null;
  kind: "photo" | "video" | "asset" | "sticker" | "audio";
  mime: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  /** Live Photo：长按播放的配对视频地址 */
  liveVideo: string | null;
  /** 视频是否 HEVC 编码（桌面 Chrome/Firefox 大多放不了，用来显示提示） */
  hevc: boolean | null;
  /** 音频时长（秒） */
  duration: number | null;
  /** 展示顺序（owned 媒体和引用媒体共用一个序号） */
  sort: number;
  /** true = 从相册引用来的（条目不拥有它，删除条目不会删掉原文件） */
  ref?: boolean;
};

export type EntryWithMedia = Omit<EntryRow, "layout" | "tags"> & { media: PublicMedia[]; layout: BoardLayout | null; tags: string[] };

/** 相册墙条目：照片或视频（素材 asset 不上墙），带上条目日期 */
export type AlbumPhoto = Omit<PublicMedia, "kind"> & {
  kind: "photo" | "video";
  entryDate: string;
  /** 所属条目 id（孤儿媒体为 null），拍立得墙按它判断「这组照片的一句话」贴在哪 */
  eid: string | null;
  /** 「存照片」时写的那句话（只有 photo 类条目才有），墙上贴成便利贴、灯箱里小字展示 */
  note: string | null;
  /** 所属条目贴的标签（「青海之行」这类） */
  tags: string[];
  /** 这张媒体的上传时间（ISO）：后台按张管理展示「传于」 */
  createdAt: string;
};

const VALID_TYPES: EntryType[] = ["journal", "photo", "quote", "letter", "board"];

type RefItem = { id: string; caption?: unknown; sort?: unknown };

/** 解析 entries.ref_media 的原始引用项（不查库，供批量装载用） */
function parseRefItems(r: EntryRow): RefItem[] {
  let list: { id?: unknown; caption?: unknown; sort?: unknown }[] = [];
  try {
    const parsed = JSON.parse(r.ref_media ?? "[]");
    if (Array.isArray(parsed)) list = parsed.slice(0, 60);
  } catch {
    /* 坏 JSON 当空处理 */
  }
  return list.filter((ref): ref is RefItem => typeof ref.id === "string");
}

/** 一条引用项 → 展示媒体（口径与旧 refMediaOf 一致：只认照片/视频、不引用自己名下的） */
function refItemView(ref: RefItem, row: MediaRow | undefined, owner: EntryRow): PublicMedia | null {
  if (!row || (row.kind !== "photo" && row.kind !== "video") || row.entry_id === owner.id) return null;
  const sort = typeof ref.sort === "number" && Number.isFinite(ref.sort) ? Math.min(9999, Math.trunc(ref.sort)) : 0;
  const caption = typeof ref.caption === "string" && ref.caption.trim() ? ref.caption.slice(0, 300) : null;
  return { ...publicMedia(row), caption: caption ?? row.caption ?? null, sort, ref: true };
}

/** 批量装载：一批条目连同各自媒体一次查齐（自有媒体 1 条 SQL + 引用媒体 1 条 SQL），
 *  替代原来「每页查一次自有媒体、每张引用再查一次」的 N+1 */
function hydrateEntries(rows: EntryRow[]): EntryWithMedia[] {
  if (rows.length === 0) return [];

  // 1) 自有媒体：IN 一把查回，按 entry_id 分组
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => "?").join(",");
  const ownedByEntry = new Map<string, MediaRow[]>();
  const ownedRows = db
    .prepare(
      `SELECT m.* FROM media m WHERE m.entry_id IN (${ph})
       AND NOT EXISTS (SELECT 1 FROM media p WHERE p.entry_id = m.entry_id AND p.live_video_id = m.id)
       ORDER BY m.sort, m.created_at`
    )
    .all(...ids) as MediaRow[];
  for (const row of ownedRows) {
    const list = ownedByEntry.get(row.entry_id ?? "") ?? [];
    list.push(row);
    ownedByEntry.set(row.entry_id ?? "", list);
  }

  // 2) 引用媒体：解析所有条目的 ref_media，攒齐 id 一次查回
  const refItemsByEntry = new Map<string, RefItem[]>();
  const refIdSet = new Set<string>();
  for (const r of rows) {
    const items = parseRefItems(r);
    refItemsByEntry.set(r.id, items);
    for (const it of items) refIdSet.add(it.id);
  }
  const refById = new Map<string, MediaRow>();
  if (refIdSet.size > 0) {
    const refIds = [...refIdSet];
    const ph2 = refIds.map(() => "?").join(",");
    const refRows = db.prepare(`SELECT * FROM media WHERE id IN (${ph2})`).all(...refIds) as MediaRow[];
    for (const row of refRows) refById.set(row.id, row);
  }

  return rows.map((r) => {
    const owned = (ownedByEntry.get(r.id) ?? []).map((row) => publicMedia(row));
    const ownedIds = new Set(owned.map((m) => m.id));
    const seen = new Set<string>();
    const refs: PublicMedia[] = [];
    for (const ref of refItemsByEntry.get(r.id) ?? []) {
      if (seen.has(ref.id)) continue;
      seen.add(ref.id);
      const view = refItemView(ref, refById.get(ref.id), r);
      if (view) refs.push(view);
    }
    const media = [...owned, ...refs.filter((m) => !ownedIds.has(m.id))].sort((a, b) => a.sort - b.sort);
    return { ...r, layout: parseBoardLayout(r.layout), tags: parseTags(r.tags), media };
  });
}

/** 清洗要写进 ref_media 的引用列表（媒体必须真实存在且是照片/视频） */
function sanitizeRefMediaList(input: EntryInput["refMedia"], ownedIds: Set<string>): string {
  const clean: { id: string; caption: string | null; sort: number }[] = [];
  for (const ref of (input ?? []).slice(0, 60)) {
    if (!ref || typeof ref.id !== "string" || ownedIds.has(ref.id)) continue;
    const row = getMediaById(ref.id);
    if (!row || (row.kind !== "photo" && row.kind !== "video")) continue;
    const sort = typeof ref.sort === "number" && Number.isFinite(ref.sort) ? Math.min(9999, Math.trunc(ref.sort)) : 0;
    const caption = typeof ref.caption === "string" && ref.caption.trim() ? ref.caption.slice(0, 300) : null;
    clean.push({ id: ref.id, caption, sort });
  }
  return JSON.stringify(clean);
}

/** 读者视角：已发布且已到公开时间；作者视角 includeDrafts = true 时全看；
 *  includeDrafts = "own" 给她用——公开的照常看，未公开（定时未到/旧草稿）
 *  只看自己创建的，他的未发表内容不进她的 payload；
 *  guest = true 时只看标了公开的页（访客模式，未登录） */
export function listEntries(
  opts: {
    type?: EntryType;
    excludeTypes?: EntryType[];
    includeDrafts?: boolean | "own";
    limit?: number;
    guest?: boolean;
  } = {}
): EntryWithMedia[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.type) {
    where.push("type = @type");
    params.type = opts.type;
  }
  if (opts.excludeTypes?.length) {
    where.push(`type NOT IN (${opts.excludeTypes.map((_, i) => `@ex${i}`).join(", ")})`);
    opts.excludeTypes.forEach((t, i) => (params[`ex${i}`] = t));
  }
  if (opts.includeDrafts === "own") {
    where.push("((published = 1 AND (reveal_at IS NULL OR reveal_at <= @today)) OR created_by = 'reader')");
    params.today = todayLocal();
  } else if (!opts.includeDrafts) {
    where.push("published = 1");
    where.push("(reveal_at IS NULL OR reveal_at <= @today)");
    params.today = todayLocal();
  }
  if (opts.guest) {
    where.push("visibility = 'public'");
  }
  const sql = `SELECT * FROM entries ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY entry_date DESC, created_at DESC ${opts.limit ? "LIMIT @limit" : ""}`;
  if (opts.limit) params.limit = opts.limit;
  const rows = db.prepare(sql).all(params) as EntryRow[];
  return hydrateEntries(rows);
}

/** 读者能看到的语录条数（结算单用），过滤口径和语录馆一致 */
export function countQuotes(guest = false): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM entries WHERE type = 'quote' AND published = 1 AND (reveal_at IS NULL OR reveal_at <= ?)${guest ? " AND visibility = 'public'" : ""}`
    )
    .get(todayLocal()) as { n: number };
  return row.n;
}

export function getEntry(id: string): EntryWithMedia | undefined {
  const row = db.prepare("SELECT * FROM entries WHERE id = ?").get(id) as EntryRow | undefined;
  return row ? hydrateEntries([row])[0] : undefined;
}

/** 把媒体挂到条目上：孤儿（还没挂过）直接挂；已经挂在本条目上的，更新描述和排序。
 *  caption 传空串/空值都会清掉描述（编辑时要能改、也要能删）；
 *  别的条目名下的媒体抢不动（entry_id 条件兜底）。 */
function attachMedia(entryId: string, media?: { id: string; caption?: string; sort?: number; liveVideoId?: string | null }[]) {
  const stmt = db.prepare(
    `UPDATE media SET entry_id = COALESCE(entry_id, ?), caption = NULLIF(?, ''), sort = ?, live_video_id = ?
     WHERE id = ? AND (entry_id IS NULL OR entry_id = ?)`
  );
  media?.forEach((m, i) => stmt.run(entryId, m.caption ?? null, m.sort ?? i, m.liveVideoId ?? null, m.id, entryId));
}

export function createEntry(input: EntryInput): EntryWithMedia {
  if (!VALID_TYPES.includes(input.type)) throw new Error("不认识的条目类型");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) throw new Error("日期格式不对");
  const now = nowISO();
  const id = newId();
  const layout = input.type === "board" ? sanitizeBoardLayout(input.layout) : null;
  const refMedia = sanitizeRefMediaList(input.refMedia, new Set((input.media ?? []).map((m) => m.id)));
  const tags = sanitizeTags(input.tags);
  db.prepare(
    `INSERT INTO entries (id, type, title, body, speaker, mood, entry_date, published, reveal_at, layout, ref_media, tags, visibility, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.type,
    input.title?.trim() || null,
    input.body ?? "",
    input.speaker ?? null,
    input.mood ?? null,
    input.entryDate,
    input.revealAt || null,
    layout,
    refMedia === "[]" ? null : refMedia,
    tags.length > 0 ? JSON.stringify(tags) : null,
    input.visibility === "public" ? "public" : "private",
    input.createdBy === "reader" ? "reader" : "author",
    now,
    now
  );
  syncEntryRefs(db, id, refMedia === "[]" ? null : refMedia, layout);
  attachMedia(id, input.media);
  // 表单里打的标签落到这一页的每张媒体上（相册墙按张筛选），也进全局标签库
  if (tags.length > 0) {
    db.prepare("UPDATE media SET tags = ? WHERE entry_id = ?").run(JSON.stringify(tags), id);
    upsertTags(tags);
  }
  return getEntry(id)!;
}

export function updateEntry(id: string, input: EntryInput): EntryWithMedia {
  if (!VALID_TYPES.includes(input.type)) throw new Error("不认识的条目类型");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate)) throw new Error("日期格式不对");
  const layout = input.type === "board" ? sanitizeBoardLayout(input.layout) : null;
  const refMedia = sanitizeRefMediaList(input.refMedia, new Set((input.media ?? []).map((m) => m.id)));
  const tags = sanitizeTags(input.tags);
  // 没传可见性就保留原值（拼贴画板保存时不带这个字段，不能把公开页悄悄改回私密）
  const currentVis = (
    db.prepare("SELECT visibility FROM entries WHERE id = ?").get(id) as { visibility: "public" | "private" } | undefined
  )?.visibility;
  const visibility = input.visibility ?? currentVis ?? "private";
  db.prepare(
    `UPDATE entries SET type = ?, title = ?, body = ?, speaker = ?, mood = ?, entry_date = ?, reveal_at = ?, layout = ?, ref_media = ?, tags = ?, visibility = ?, updated_at = ? WHERE id = ?`
  ).run(
    input.type,
    input.title?.trim() || null,
    input.body ?? "",
    input.speaker ?? null,
    input.mood ?? null,
    input.entryDate,
    input.revealAt || null,
    layout,
    refMedia === "[]" ? null : refMedia,
    tags.length > 0 ? JSON.stringify(tags) : null,
    visibility,
    nowISO(),
    id
  );
  syncEntryRefs(db, id, refMedia === "[]" ? null : refMedia, layout);
  attachMedia(id, input.media);
  // 表单里打的标签同步到这一页的每张媒体上（「本子里的一切」可以按张再改），也进全局标签库
  if (tags.length > 0) {
    db.prepare("UPDATE media SET tags = ? WHERE entry_id = ?").run(JSON.stringify(tags), id);
    upsertTags(tags);
  }
  for (const mid of input.removeMediaIds ?? []) {
    const row = getMediaRow(mid);
    if (row && row.entry_id === id) {
      // 删照片时，它引用的 Live 配对视频（孤儿行）也一起删
      if (row.live_video_id) {
        const liveRow = getMediaRow(row.live_video_id);
        if (liveRow && liveRow.entry_id === null) awaitDelete(liveRow);
        else if (liveRow && liveRow.entry_id === id) awaitDelete(liveRow);
      }
      awaitDelete(row);
    }
  }
  return getEntry(id)!;
}

function getMediaRow(id: string): MediaRow | undefined {
  return db.prepare("SELECT * FROM media WHERE id = ?").get(id) as MediaRow | undefined;
}

// better-sqlite3 是同步的，删除文件包一层立即执行的 async
function awaitDelete(row: MediaRow) {
  void deleteMediaFile(row);
}

export function deleteEntry(id: string): void {
  // 连 Live Photo 的配对视频（未挂条目的孤儿行）一起找出来删
  const rows = db
    .prepare(
      `SELECT m.* FROM media m
       WHERE m.entry_id = ?
          OR m.id IN (SELECT p.live_video_id FROM media p WHERE p.entry_id = ? AND p.live_video_id IS NOT NULL)`
    )
    .all(id, id) as MediaRow[];
  for (const row of rows) awaitDelete(row);
  db.prepare("DELETE FROM entries WHERE id = ?").run(id);
}

/** 相册拍立得墙：照片 + 视频（被配对成 Live Photo 的视频除外，它属于某张照片）。
 *  默认只展示挂在条目上的媒体——孤儿（没入册的上传：放映室专用的视频/封面、
 *  放弃编辑的草稿）不上读者能看到的墙；后台「本子里的一切」「从本子里选」
 *  传 includeOrphans 才把孤儿带出来，方便管理。guest = 只看公开页上的 */
export function listAlbum(opts: { guest?: boolean; includeOrphans?: boolean } = {}): AlbumPhoto[] {
  const guestSql = opts.guest
    ? "AND e.visibility = 'public'"
    : "";
  const attachSql = opts.includeOrphans
    ? "(e.id IS NULL OR (e.published = 1 AND (e.reveal_at IS NULL OR e.reveal_at <= ?)))"
    : "(e.published = 1 AND (e.reveal_at IS NULL OR e.reveal_at <= ?))";
  const rows = db
    .prepare(
      `SELECT m.*, e.entry_date AS edate, e.id AS eid, e.body AS enote, e.type AS etype
       FROM media m LEFT JOIN entries e ON m.entry_id = e.id
       WHERE m.kind IN ('photo', 'video')
         AND NOT EXISTS (SELECT 1 FROM media p WHERE p.live_video_id = m.id)
         AND ${attachSql}${guestSql}
       ORDER BY COALESCE(e.entry_date, substr(m.created_at, 1, 10)) DESC, m.created_at DESC`
    )
    .all(todayLocal()) as (MediaRow & { edate: string | null; eid: string | null; enote: string | null; etype: string | null })[];
  const visible = opts.guest ? rows.filter((r) => r.eid !== null) : rows;
  // SQL 里已限定 kind IN (photo, video)，这里把类型也收窄（PublicMedia 含 asset）
  return visible.map((r) => ({
    ...publicMedia(r),
    kind: r.kind === "video" ? ("video" as const) : ("photo" as const),
    entryDate: r.edate ?? r.created_at.slice(0, 10),
    eid: r.eid,
    // 「存照片」写的那句话：只有照片条目才有，墙上会贴成便利贴
    note: r.etype === "photo" && r.enote?.trim() ? r.enote.trim().slice(0, 120) : null,
    // 标签是每张媒体自己的（本子里的一切按张管理）
    tags: parseTags(r.tags),
    createdAt: r.created_at,
  }));
}

/** 只要照片的地方（首页横滑、彩蛋选片） */
export function listPhotos(opts: { guest?: boolean } = {}): AlbumPhoto[] {
  return listAlbum(opts).filter((m) => m.kind === "photo");
}

export function countPhotos(opts: { guest?: boolean } = {}): number {
  // 和墙同一口径：只数挂了条目的照片（孤儿不上墙）。
  // 直接 COUNT，不再把整墙照片拉回内存数一遍
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM media m JOIN entries e ON m.entry_id = e.id
       WHERE m.kind = 'photo'
         AND NOT EXISTS (SELECT 1 FROM media p WHERE p.live_video_id = m.id)
         AND e.published = 1 AND (e.reveal_at IS NULL OR e.reveal_at <= ?)
         ${opts.guest ? "AND e.visibility = 'public'" : ""}`
    )
    .get(todayLocal()) as { n: number };
  return row.n;
}

/** 只改一页的公开/仅她（后台列表上的快捷开关用） */
export function setEntryVisibility(id: string, visibility: "public" | "private"): void {
  db.prepare("UPDATE entries SET visibility = ?, updated_at = ? WHERE id = ?").run(visibility, nowISO(), id);
}
