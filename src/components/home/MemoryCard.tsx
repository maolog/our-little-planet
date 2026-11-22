import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Memory } from "@/lib/memories";
import { pickOf, tiltOf, TAPE_TONES, NOTE_TONES } from "@/lib/tilt";
import { PolaroidCard } from "@/components/journal/PolaroidCard";
import { StickyNote } from "@/components/journal/StickyNote";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";

function excerpt(text: string, max = 90): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** 「上个月的今天」「3 年 2 个月前的那几天」——按语言拼 label */
function memoryLabel(locale: Locale, monthsBack: number, exactDay: boolean): string {
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  if (monthsBack === 1) return t(exactDay ? "mem.lastMonthExact" : "mem.lastMonthDiff");
  if (monthsBack < 12) return t(exactDay ? "mem.monthsExact" : "mem.monthsDiff", { n: monthsBack });
  const years = Math.floor(monthsBack / 12);
  const rest = monthsBack % 12;
  return rest === 0
    ? t(exactDay ? "mem.yearsExact" : "mem.yearsDiff", { n: years })
    : t(exactDay ? "mem.ymExact" : "mem.ymDiff", { y: years, m: rest });
}

/** 「这本本子记得」：首页浮出的一张旧日子——N 个月前的今天（前后几天也算）。
 *  有照片贴拍立得，是语录贴便利贴，纯文字就盖一枚月份圆章 */
export async function MemoryCard({ memory }: { memory: Memory }) {
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const { entry } = memory;
  const label = memoryLabel(locale, memory.monthsBack, memory.exactDay);
  const photo = entry.media.find((m) => m.kind === "photo");
  const snippet = excerpt(entry.body);
  const isQuote = entry.type === "quote";
  const [y, mo, d] = entry.entry_date.split("-");

  return (
    <section className="mt-16 py-8">
      <p className="font-script text-2xl text-rose-deep">{t("home.mem.title")}</p>
      <div className="mb-7 mt-2 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-3xl font-bold">{label}</h2>
        <span className="datestamp">{entry.entry_date.replaceAll("-", ".")}</span>
      </div>

      <div className="card-paper flex flex-col items-center gap-8 sm:flex-row">
        <div className="shrink-0">
          {photo ? (
            <div className="w-44 sm:w-48">
              <PolaroidCard
                src={photo.thumbUrl ?? photo.url}
                caption={photo.caption}
                alt={photo.caption ?? t("home.mem.photoAlt")}
                tilt={tiltOf(`${entry.id}-mem`)}
                tone={pickOf(entry.id, TAPE_TONES)}
                tape="center"
                width={photo.width}
                height={photo.height}
                liveVideo={photo.liveVideo}
              />
            </div>
          ) : isQuote && snippet ? (
            <div className="w-48 sm:w-52">
              <StickyNote
                text={excerpt(entry.body, 60)}
                speaker={entry.speaker}
                tilt={tiltOf(`${entry.id}-mem`, 3)}
                tone={pickOf(entry.id, NOTE_TONES)}
              />
            </div>
          ) : (
            <span className="stamp-circle">
              <span className="font-round text-xl font-bold leading-none">
                {Number(mo)}.{Number(d)}
              </span>
              <span className="mt-1 font-round text-[11px] tracking-widest opacity-80">{y}</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          {isQuote ? (
            <p className="text-xl leading-relaxed">
              「{snippet}」
              {entry.speaker && <span className="ml-2 whitespace-nowrap text-base text-ink-soft">—— {entry.speaker}</span>}
            </p>
          ) : snippet ? (
            <p className="leading-relaxed text-ink-soft">{snippet}</p>
          ) : (
            <p className="leading-relaxed text-ink-soft">{t("home.mem.noWords")}</p>
          )}
          <Link href={`/journal?date=${entry.entry_date}`} className="link-soft mt-5 text-sm">
            {t("home.mem.back")}
            <ArrowRight weight="bold" className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
