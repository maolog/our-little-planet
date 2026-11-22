"use client";

import { useSyncExternalStore } from "react";
import { MoonStars, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/LocaleProvider";

export const THEME_KEY = "journal-theme";

/** 订阅 <html> 上的 class 变化（首帧由 layout 内联脚本定好，切换单靠改 DOM） */
function subscribeDark(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** 明暗模式切换：月亮/太阳换装，点一下切换 <html> 上的 .dark。
 *  偏好存 localStorage；没存过就跟系统走（首帧由 layout 里的内联脚本定好，不闪） */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const dark = useSyncExternalStore(
    subscribeDark,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* 私密模式存不了也不影响切换 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t("nav.theme.toLight") : t("nav.theme.toDark")}
      title={dark ? t("nav.theme.toLight") : t("nav.theme.toDark")}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink",
        className
      )}
    >
      {dark ? (
        <MoonStars weight="fill" className="size-4 text-butter" />
      ) : (
        <Sun weight="fill" className="size-4 text-peach" />
      )}
    </button>
  );
}
