import type { Metadata } from "next";
import { isAuthor, isReader } from "@/lib/auth";
import { recordGuestVisitFor } from "@/lib/visitors";
import { listEntries, listAlbum } from "@/lib/entries";
import { getSettings } from "@/lib/settings";
import { shePublishTypes } from "@/lib/permissions";
import { listEggs, doodleCounts } from "@/lib/eggs";
import { listMilestones } from "@/lib/milestones";
import { listScreenings } from "@/lib/screenings";
import { PenGate } from "@/components/write/PenGate";
import { WriteDashboard } from "@/components/write/WriteDashboard";
import { listAllTags } from "@/lib/tagStore";
import { IS_DEMO } from "@/lib/demo";
import { getLocale, tWith } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tWith(await getLocale(), "write.title") };
}

export default async function WritePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await recordGuestVisitFor("/write");
  // 写作台两人都能进：他（作者口令）和她（读者密码）。完全没解锁才拦在 PenGate 外
  if (!(await isReader())) {
    return (
      <PenGate
        demoHint={
          IS_DEMO
            ? tWith(await getLocale(), "write.demoHint", { password: process.env.AUTHOR_PASSWORD ?? "write-for-her" })
            : undefined
        }
      />
    );
  }
  // 「本子信息」等管理区只有他能进；settings / 彩蛋（含口令）不进她的 RSC payload
  const canManage = await isAuthor();
  // searchParams 在服务端读好传进去（客户端不再 useSearchParams，水合更稳）
  const sp = await searchParams;
  const FILTER_KEYS = ["all", "journal", "photo", "quote", "letter", "milestone", "screening", "egg"];
  const initialFilter = typeof sp.filter === "string" && FILTER_KEYS.includes(sp.filter) ? sp.filter : undefined;
  const [entries, settings, eggs, milestones, screenings, album] = [
    // 口径与 GET /api/entries 一致：他全看，她只多看自己创建的未公开条目
    listEntries({ includeDrafts: canManage ? true : "own" }),
    getSettings(),
    listEggs(),
    listMilestones(),
    // 排片两人都能发：未首映的也要进列表（否则自己发的片在列表里看不见）
    listScreenings({ includeUnpublished: true }),
    // 后台的按张管理和「从本子里选」要看得到孤儿（放映室专用的视频/封面、
    // 还没保存的草稿都在这里管理），读者看得到的墙上则永远不出现
    listAlbum({ includeOrphans: true }),
  ];
  return (
    <WriteDashboard
      initialType={typeof sp.type === "string" ? sp.type : undefined}
      initialTab={typeof sp.tab === "string" ? sp.tab : undefined}
      editId={typeof sp.edit === "string" ? sp.edit : undefined}
      allTags={listAllTags()}
      initialFilter={initialFilter}
      initialEntries={entries}
      canManage={canManage}
      settings={canManage ? settings : undefined}
      // 她能发什么由 settings 算好传入（只传类型名，settings 本体不进她的 RSC payload）；他不传＝不限
      publishTypes={canManage ? undefined : Array.from(shePublishTypes(settings))}
      initialEggs={
        canManage
          ? eggs.map((e) => {
              const counts = doodleCounts(e.id);
              const rec: Record<string, number> = {};
              for (const [k, v] of counts) rec[k] = v;
              return { id: e.id, title: e.title, password: e.password, revealDate: e.revealDate, letter: e.letter, photoIds: e.photoIds, doodles: rec };
            })
          : []
      }
      initialMilestones={milestones.map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        date: m.date,
        icon: m.icon,
        mediaIds: m.media.map((x) => x.id),
        visibility: m.visibility,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }))}
      initialScreenings={screenings}
      album={album.map((p) => ({
        id: p.id,
        url: p.url,
        thumbUrl: p.thumbUrl,
        posterUrl: p.posterUrl,
        caption: p.caption,
        kind: p.kind,
        mime: p.mime,
        width: p.width,
        height: p.height,
        liveVideo: p.liveVideo,
        hevc: p.hevc,
        entryDate: p.entryDate,
        tags: p.tags,
        createdAt: p.createdAt,
      }))}
    />
  );
}
