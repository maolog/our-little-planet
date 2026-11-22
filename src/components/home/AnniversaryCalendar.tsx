"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { daysBetween, nextSpecialDay, specialDaysInYear, type SpecialDay, type SpecialDayKind } from "@/lib/special-days";
import { Sticker, type StickerName } from "@/components/journal/Sticker";
import { WashiTape } from "@/components/journal/WashiTape";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Dict } from "@/i18n";

const WD_KEYS = ["home.cal.wd0", "home.cal.wd1", "home.cal.wd2", "home.cal.wd3", "home.cal.wd4", "home.cal.wd5", "home.cal.wd6"] as const satisfies readonly (keyof Dict)[];

/** 各种日子在列表里配的小贴纸 */
const KIND_ICON: Record<SpecialDayKind, StickerName> = {
  milestone: "heart",
  anniversary: "star",
  festival: "flower",
};

function fmtYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function countdownText(today: string, date: string, t: (key: keyof Dict, params?: Record<string, string | number>) => string): { text: string; isToday: boolean } {
  const diff = daysBetween(today, date);
  if (diff === 0) return { text: t("home.cal.today"), isToday: true };
  if (diff > 0) return { text: t("home.cal.inDays", { n: diff }), isToday: false };
  return { text: t("home.cal.pastDays", { n: -diff }), isToday: false };
}

/** 首页「重要的日子」月历：从在一起的纪念日推整百天 / 520 / 1314 / 周年，
 *  再叠上情人节、520、元宵、七夕，翻月看哪天有记号、还差几天到 */
export function AnniversaryCalendar({ startDate, today: initialToday }: { startDate: string; today: string }) {
  const { locale, t } = useLocale();
  const [view, setView] = useState(() => ({ y: Number(initialToday.slice(0, 4)), m: Number(initialToday.slice(5, 7)) - 1 }));

  // 今天是哪天只有浏览器知道：水合前用服务端传入的日期（和 SSR 标记一致），
  // 水合后切到浏览器本地日期，服务器和浏览器跨日零点时不闪不错
  const noopSubscribe = () => () => undefined;
  const today = useSyncExternalStore(
    noopSubscribe,
    () => {
      const n = new Date();
      return fmtYmd(n.getFullYear(), n.getMonth(), n.getDate());
    },
    () => initialToday
  );

  const yearDays = useMemo(() => specialDaysInYear(view.y, startDate, locale), [view.y, startDate, locale]);
  const monthKey = `${view.y}-${String(view.m + 1).padStart(2, "0")}`;
  const monthDays = useMemo(() => yearDays.filter((d) => d.date.startsWith(monthKey)), [yearDays, monthKey]);
  const byDay = useMemo(() => {
    const m = new Map<number, SpecialDay[]>();
    for (const d of monthDays) {
      const day = Number(d.date.slice(8, 10));
      m.set(day, [...(m.get(day) ?? []), d]);
    }
    return m;
  }, [monthDays]);
  const next = useMemo(() => nextSpecialDay(today, startDate, locale), [today, startDate, locale]);

  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: 1 | -1) {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { ...v, m };
    });
  }

  const atLowerBound = view.y <= 1901 && view.m === 0; // solarlunar 农历数据只到 2100 年
  const atUpperBound = view.y >= 2099 && view.m === 11;

  return (
    <section className="mt-16 py-8" aria-label={t("home.cal.aria")}>
      <div className="mb-7 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-bold">{t("home.cal.title")}</h2>
        {next && (
          <p className="font-round text-sm tracking-wider text-ink-soft">
            {t("home.cal.next")} · <span className="font-bold text-rose-deep">{next.label}</span> ·{" "}
            {countdownText(today, next.date, t).text}
          </p>
        )}
      </div>

      <div className="card-paper mx-auto max-w-md px-6 py-7">
        <WashiTape tone="rose" className="-top-3 left-1/2" />

        {/* 月份切换 */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={t("home.cal.prevMonth")}
            disabled={atLowerBound}
            onClick={() => shiftMonth(-1)}
            className="grid size-9 place-items-center rounded-full border border-ink/15 text-ink-soft transition hover:bg-ink/5 hover:text-ink disabled:opacity-30"
          >
            <CaretLeft weight="bold" className="size-5" />
          </button>
          <div className="text-center">
            <p className="font-script text-3xl leading-none text-rose-deep">
              {t("home.cal.month", { y: view.y, m: view.m + 1 })}
            </p>
            <p className="mt-1.5 font-round text-[9px] tracking-[0.32em] text-ink-soft/70">{t("home.cal.sub")}</p>
          </div>
          <button
            type="button"
            aria-label={t("home.cal.nextMonth")}
            disabled={atUpperBound}
            onClick={() => shiftMonth(1)}
            className="grid size-9 place-items-center rounded-full border border-ink/15 text-ink-soft transition hover:bg-ink/5 hover:text-ink disabled:opacity-30"
          >
            <CaretRight weight="bold" className="size-5" />
          </button>
        </div>

        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 星期表头 */}
          <div className="mt-6 grid grid-cols-7">
            {WD_KEYS.map((key, i) => (
              <span key={key} className={cn("pb-2 text-center font-round text-xs font-semibold", i === 0 || i === 6 ? "text-rose-deep/60" : "text-ink-soft")}>
                {t(key)}
              </span>
            ))}
          </div>

          {/* 日期格：纪念日实心玫瑰圆、节日数字染玫瑰加小点、今天虚线圈 */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const evs = byDay.get(day);
              const ours = evs?.some((e) => e.kind !== "festival");
              const isToday = fmtYmd(view.y, view.m, day) === today;
              return (
                <div key={i} className="grid place-items-center py-0.5">
                  <span
                    title={evs?.map((e) => e.label).join(" · ")}
                    className={cn(
                      "relative grid size-9 place-items-center rounded-full font-round text-sm",
                      ours
                        ? "bg-rose-deep font-bold text-paper shadow-sm"
                        : evs
                          ? "font-bold text-rose-deep"
                          : "text-ink",
                      isToday && (ours
                        ? "ring-2 ring-rose-deep/50 ring-offset-2 ring-offset-card"
                        : "border-2 border-dashed border-rose-deep/80 font-bold")
                    )}
                  >
                    {day}
                    {evs && !ours && <span className="absolute bottom-0.5 size-1 rounded-full bg-rose-deep/70" />}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-round text-[10px] tracking-wider text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-deep" />
              {t("home.cal.legendOurs")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-deep/70" />
              {t("home.cal.legendFest")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-dashed border-rose-deep/70" />
              {t("home.cal.legendToday")}
            </span>
          </div>

          {/* 这个月的日子清单 */}
          {monthDays.length > 0 ? (
            <ul className="mt-5">
              {monthDays.map((e) => {
                const d = new Date(e.date + "T00:00:00");
                const cd = countdownText(today, e.date, t);
                return (
                  <li key={e.date + e.label} className="flex items-center justify-between gap-3 border-t border-dashed border-ink/15 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Sticker name={KIND_ICON[e.kind]} className="size-4.5 shrink-0 text-rose-deep/70" />
                      <span className="min-w-0">
                        <span className="block font-round text-sm font-semibold text-ink">{e.label}</span>
                        <span className="block font-hand text-xs text-ink-soft">
                          {t("home.cal.dayRow", { m: d.getMonth() + 1, d: d.getDate(), w: t(WD_KEYS[d.getDay()]) })}
                        </span>
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-round text-sm font-bold tabular-nums", cd.isToday ? "text-rose-deep" : "text-ink-soft")}>
                      {cd.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-5 border-t border-dashed border-ink/15 pt-4 text-center font-script text-2xl text-ink-soft/70">
              {t("home.cal.empty")}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
