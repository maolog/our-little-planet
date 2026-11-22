import { ChatTeardropText, EnvelopeSimple, Images, Notebook, Scissors } from "@phosphor-icons/react/dist/ssr";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";

export type MonthStats = {
  /** 当前月份 YYYY-MM */
  monthKey: string;
  photos: number;
  videos: number;
  pages: number;
  quotes: number;
  letters: number;
  /** 本月金句（随机挑的一句） */
  quote: { body: string; speaker: string | null } | null;
};

function gradeOf(total: number): string {
  if (total >= 12) return "S";
  if (total >= 6) return "A";
  return "B";
}

function Row({ icon: Icon, label, note, value, unit }: { icon: typeof Images; label: string; note: string; value: number; unit: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-dashed border-ink/15 py-2.5">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon weight="fill" className="size-4.5 shrink-0 text-rose-deep/70" />
        <span className="min-w-0">
          <span className="block font-round text-sm font-semibold text-ink">{label}</span>
          <span className="block truncate font-hand text-xs text-ink-soft">{note}</span>
        </span>
      </span>
      <span className="shrink-0 font-round text-lg font-bold leading-none text-ink tabular-nums">
        {value} {unit}
      </span>
    </li>
  );
}

/** 「本月我们」月度结算单：这个数字月里贴了多少照片、写了几页、收了几句。
 *  视觉沿用大事记的恋综结算单：撕票线 + 虚线行 + 右上角的糖分评级章 */
export async function MonthSettlement({ stats }: { stats: MonthStats }) {
  const total = stats.photos + stats.videos + stats.pages + stats.quotes + stats.letters;
  if (total === 0) return null;
  const month = Number(stats.monthKey.split("-")[1]);
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);

  return (
    <section className="mt-16 py-8" aria-label={t("home.settle.aria", { month })}>
      <div className="card-paper relative mx-auto max-w-md px-6 py-7 sm:px-8">
        {/* 糖分评级章：盖在右上角的红墨小圆章 */}
        <span className="grade-stamp">
          <span className="font-round text-lg font-bold leading-none">{gradeOf(total)}</span>
          <span className="font-round text-[8px] tracking-widest opacity-80">{t("home.settle.stamp")}</span>
        </span>
        <Scissors weight="fill" className="absolute -top-2.5 left-6 size-5 -rotate-90 text-ink/25" aria-hidden />

        <h2 className="text-center font-script text-3xl leading-tight text-rose-deep">{t("home.settle.title", { month })}</h2>
        <p className="mt-1 text-center font-round text-[9px] tracking-[0.32em] text-ink-soft/70">
          {t("home.settle.sub")}
        </p>

        <ul className="mt-5">
          {stats.photos + stats.videos > 0 && (
            <Row
              icon={Images}
              label={t("home.settle.photosLabel")}
              note={t("home.settle.photosNote")}
              value={stats.photos + stats.videos}
              unit={t("home.settle.photosUnit")}
            />
          )}
          {stats.pages > 0 && (
            <Row icon={Notebook} label={t("home.settle.pagesLabel")} note={t("home.settle.pagesNote")} value={stats.pages} unit={t("home.settle.pagesUnit")} />
          )}
          {stats.quotes > 0 && (
            <Row icon={ChatTeardropText} label={t("home.settle.quotesLabel")} note={t("home.settle.quotesNote")} value={stats.quotes} unit={t("home.settle.quotesUnit")} />
          )}
          {stats.letters > 0 && (
            <Row icon={EnvelopeSimple} label={t("home.settle.lettersLabel")} note={t("home.settle.lettersNote")} value={stats.letters} unit={t("home.settle.lettersUnit")} />
          )}
        </ul>

        {stats.quote && (
          <div className="mt-4 border-t border-dashed border-ink/15 pt-4">
            <p className="text-center font-round text-[10px] font-bold tracking-[0.25em] text-ink-soft/70">{t("home.settle.quoteTitle")}</p>
            <p className="mt-2 text-center font-hand text-[1.05rem] leading-relaxed">
              「{stats.quote.body.length > 40 ? stats.quote.body.slice(0, 40) + "…" : stats.quote.body}」
            </p>
            {stats.quote.speaker && (
              <p className="mt-1 text-center font-round text-xs tracking-wider text-ink-soft">—— {stats.quote.speaker}</p>
            )}
          </div>
        )}

        <p className="mt-5 border-t border-dashed border-ink/15 pt-3 text-center font-script text-xl text-ink-soft/70">
          {t("home.settle.footer")}
        </p>
      </div>
    </section>
  );
}
