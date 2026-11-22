import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChatTeardropText, EnvelopeSimple, Notebook } from "@phosphor-icons/react/dist/ssr";
import { isReader } from "@/lib/auth";
import { recordGuestVisitFor } from "@/lib/visitors";
import { listReplies, listSeens } from "@/lib/marks";
import { PenGate } from "@/components/write/PenGate";
import { DoodleDivider } from "@/components/journal/DoodleDivider";
import { Sticker } from "@/components/journal/Sticker";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tWith(await getLocale(), "meta.marks") };
}

type T = (key: keyof Dict, params?: Record<string, string | number>) => string;

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function entryLabel(t: T, type: string, title: string | null): string {
  if (type === "letter") return t("marks.rowLetter", { title: title ?? t("letter.forYou") });
  if (type === "journal") return title ? t("marks.rowJournal", { title }) : t("marks.rowJournalEmpty");
  if (type === "quote") return t("marks.rowQuote");
  if (type === "board") return title ? t("marks.rowBoard", { title }) : t("marks.rowBoardEmpty");
  if (type === "screening") return t("marks.rowScreening", { title: title ?? t("screening.defaultTitle") });
  return t("marks.rowPage");
}

function entryHref(type: string, entryId: string, entryDate: string): string {
  if (type === "letter") return "/letters";
  if (type === "screening") return "/screenings";
  return `/journal?date=${entryDate}`;
}

/** 她的痕迹：她盖过的已阅印章、页脚寄回来的评论（文字/表情/图），解锁本子的两人都能进这一页 */
export default async function MarksPage() {
  await recordGuestVisitFor("/write/marks");
  if (!(await isReader())) return <PenGate />;
  const locale = await getLocale();
  const t: T = (key, params) => tWith(locale, key, params);
  const [replies, seens] = [listReplies(), listSeens()];

  return (
    <div className="py-10">
      <header className="text-center">
        <p className="font-script text-2xl text-rose-deep">only for you</p>
        <h1 className="mt-2 text-4xl font-bold">{t("meta.marks")}</h1>
        <p className="mt-3 text-ink-soft">{t("marks.subtitle")}</p>
        <DoodleDivider variant="hearts" className="mx-auto mt-6 w-28" />
        <Link href="/write" className="link-soft mt-5 text-sm">
          <ArrowLeft weight="bold" className="size-3.5" />
          {t("nav.backToWrite")}
        </Link>
      </header>

      <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-2">
        {/* 评论 */}
        <section className="card-paper">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ChatTeardropText weight="fill" className="size-5 text-rose-deep/70" />
            {t("marks.comments")}
            <span className="ml-auto font-round text-sm font-bold tracking-widest text-ink-soft">
              {t("marks.commentCount", { n: replies.length })}
            </span>
          </h2>
          {replies.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Sticker name="cloud" className="size-10 text-mist" />
              <p className="text-sm text-ink-soft">{t("marks.emptyComments")}</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {replies.map((r) => (
                <li key={r.id} className="rounded-2xl bg-rose-soft/70 px-4 py-3">
                  {r.body && <p className="whitespace-pre-wrap leading-relaxed">{r.body}</p>}
                  {r.media.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.media.map((m) => (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("marks.zoomPhoto")}
                          className="block transition hover:opacity-85"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- 评论图走带鉴权的 /api/media */}
                          <img src={m.thumbUrl ?? m.url} alt="" loading="lazy" className="max-h-24 rounded-lg object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 font-round text-[11px] tracking-wider text-ink-soft">
                    <EnvelopeSimple weight="fill" className="size-3.5 text-rose-deep/60" />
                    <Link href={entryHref(r.entryType, r.entryId, r.entryDate)} className="font-bold text-rose-deep hover:opacity-75">
                      {entryLabel(t, r.entryType, r.entryTitle)}
                    </Link>
                    <span className="opacity-60">·</span>
                    <span>{fmt(r.createdAt)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 印章 */}
        <section className="card-paper">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Notebook weight="fill" className="size-5 text-rose-deep/70" />
            {t("marks.stamps")}
            <span className="ml-auto font-round text-sm font-bold tracking-widest text-ink-soft">
              {t("marks.stampCount", { n: seens.length })}
            </span>
          </h2>
          {seens.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Sticker name="heart" className="size-10 text-rose/70" />
              <p className="text-sm text-ink-soft">{t("marks.emptyStamps")}</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {seens.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl border border-ink/8 px-4 py-2.5">
                  <span className="inline-flex shrink-0 rotate-3 items-center rounded-full border-2 border-rose-deep/50 px-2.5 py-0.5 font-round text-[10px] font-bold tracking-widest text-rose-deep/80">
                    {t("marks.seen")}
                  </span>
                  <Link
                    href={entryHref(s.entryType, s.entryId, s.entryDate)}
                    className="min-w-0 flex-1 truncate font-bold text-ink hover:text-rose-deep"
                  >
                    {entryLabel(t, s.entryType, s.entryTitle)}
                  </Link>
                  <span className="shrink-0 font-round text-[11px] tracking-wider text-ink-soft">{fmt(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
