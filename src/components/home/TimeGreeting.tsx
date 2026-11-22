"use client";

import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { Sticker } from "@/components/journal/Sticker";
import { cn } from "@/lib/cn";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Dict } from "@/i18n";

type T = (key: keyof Dict, params?: Record<string, string | number>) => string;

const NIGHT = ["greet.night.1", "greet.night.2", "greet.night.3", "greet.night.4"] as const;
const MORNING = ["greet.morning.1", "greet.morning.2", "greet.morning.3"] as const;
const FORENOON = ["greet.forenoon.1", "greet.forenoon.2", "greet.forenoon.3"] as const;
const NOON = ["greet.noon.1", "greet.noon.2", "greet.noon.3"] as const;
const AFTERNOON = ["greet.afternoon.1", "greet.afternoon.2", "greet.afternoon.3"] as const;
const DUSK = ["greet.dusk.1", "greet.dusk.2", "greet.dusk.3"] as const;
const EVENING = ["greet.evening.1", "greet.evening.2", "greet.evening.3"] as const;

function pick(t: T, pool: readonly (keyof Dict)[]): string {
  return t(pool[Math.floor(Math.random() * pool.length)]);
}

function greetingFor(now: Date, startDate: string, t: T): string {
  // 纪念日优先：周年 > 每月纪念 > 时段问候
  const start = new Date(`${startDate}T00:00:00`);
  if (!Number.isNaN(start.getTime()) && now.getDate() === start.getDate()) {
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months >= 12 && months % 12 === 0) {
      const years = months / 12;
      return Math.random() < 0.5 ? t("greet.year.1", { n: years }) : t("greet.year.2", { n: years });
    }
    if (months >= 1) {
      const d = start.getDate();
      const r = Math.random();
      if (r < 1 / 3) return t("greet.month.1", { d, n: months });
      if (r < 2 / 3) return t("greet.month.2", { d });
      return t("greet.month.3", { n: months });
    }
  }
  const h = now.getHours();
  if (h >= 23 || h < 5) return pick(t, NIGHT);
  if (h < 9) return pick(t, MORNING);
  if (h < 12) return pick(t, FORENOON);
  if (h < 14) return pick(t, NOON);
  if (h < 18) return pick(t, AFTERNOON);
  if (h < 20) return pick(t, DUSK);
  return pick(t, EVENING);
}

// 问候语只在客户端出现：走 useSyncExternalStore 的客户端快照，服务端永远渲染空（不闪不跳）；
// 快照必须稳定，挑好的那句按 locale+startDate 缓存，反复读不再换
const emptySubscribe = () => () => {};
const serverSnapshot = () => null;
let cached: { key: string; line: string } | null = null;
function getGreeting(startDate: string, locale: string, t: T): string {
  const key = `${locale}|${startDate}`;
  if (!cached || cached.key !== key) {
    cached = { key, line: greetingFor(new Date(), startDate, t) };
  }
  return cached.line;
}

/** 首页的时间感知问候：按访问时刻（和纪念日）换一句页边小字，每次进来都可能不一样 */
export function TimeGreeting({ startDate, className }: { startDate: string; className?: string }) {
  const { locale, t } = useLocale();
  const line = useSyncExternalStore(emptySubscribe, () => getGreeting(startDate, locale, t), serverSnapshot);

  return (
    <p aria-live="polite" className={cn("flex min-h-7 items-center font-script text-xl text-ink-soft/90", className)}>
      {line && (
        <motion.span
          key={line}
          className="inline-flex items-center gap-1.5"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
        >
          <Sticker name="sparkle" className="size-4 shrink-0 text-rose/70" />
          {line}
        </motion.span>
      )}
    </p>
  );
}
