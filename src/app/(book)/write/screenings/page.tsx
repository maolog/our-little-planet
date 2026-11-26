import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { isAuthor, isReader } from "@/lib/auth";
import { listScreenings } from "@/lib/screenings";
import { listAlbum } from "@/lib/entries";
import { PenGate } from "@/components/write/PenGate";
import { ScreeningManager } from "@/components/screenings/ScreeningManager";
import { recordGuestVisitFor } from "@/lib/visitors";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tWith(await getLocale(), "meta.schedule") };
}

/** 放映室的后台：排一场新首映 / 管理已有的场次 */
export default async function WriteScreeningsPage() {
  await recordGuestVisitFor("/write/screenings");
  // 排片后台仅作者可见；她（读者会话）误入直接回写作台，避免 PenGate 死循环
  if (!(await isAuthor())) {
    if (await isReader()) redirect("/write");
    return <PenGate />;
  }
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const screenings = listScreenings({ includeUnpublished: true });
  // 「从本子里选」的候选：含孤儿（刚传未保存的），已入册的视频/照片都能选来用
  const album = listAlbum({ includeOrphans: true });

  return (
    <div className="mx-auto max-w-3xl py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("meta.schedule")}</h1>
        <Link href="/screenings" className="link-soft text-sm">
          {t("screening.goSee")}
          <ArrowLeft weight="bold" className="size-3.5 rotate-180" />
        </Link>
      </header>
      <p className="mt-4 px-1 text-sm leading-relaxed text-ink-soft">{t("screening.intro")}</p>
      <div className="mt-7">
        <ScreeningManager
          initial={screenings}
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
            entryDate: p.entryDate,
          }))}
        />
      </div>
      <Link href="/write" className="link-soft mt-8 text-sm">
        <ArrowLeft weight="bold" className="size-3.5" />
        {t("nav.backToWrite")}
      </Link>
    </div>
  );
}
