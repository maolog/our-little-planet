"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HTML_LANG,
  LOCALE_STORAGE_KEY,
  LOCALE_LABELS,
  LOCALES,
  isLocale,
  type Locale,
} from "./config";
import { translate, type Dict } from "./index";
import { getDict } from "./index";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof Dict, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

function readStoredLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {}
  return DEFAULT_LOCALE;
}

// 极小的外部存储：getSnapshot 惰性读一次 localStorage，
// 之后只由 setLocale 写入并通知订阅者——避免 effect 里 setState
let stored: Locale | null = null;
const listeners = new Set<() => void>();

function subscribeLocale(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getLocaleSnapshot(): Locale {
  if (stored === null) stored = readStoredLocale();
  return stored;
}

function getLocaleServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

/** 同步 localStorage + cookie + html lang，服务端与客户端共用同一套语言 */
function persistLocale(l: Locale) {
  stored = l;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, l);
  } catch {}
  // cookie 给 API route 服务端读（错误消息按语言返回）
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(l)}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = LOCALE_HTML_LANG[l];
  for (const cb of listeners) cb();
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const locale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleServerSnapshot);

  useEffect(() => {
    const initial = getLocaleSnapshot();
    document.documentElement.lang = LOCALE_HTML_LANG[initial];
    // cookie 缺失（首次访问或清过 cookie）或与本地存的不一致：补写一份给服务端；
    // 服务端组件是按 cookie 渲染的，本地存的语言和它对不上时要重新拉一次 RSC 才会换语言
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
    const cookieVal = raw ? raw.slice(LOCALE_COOKIE.length + 1) : undefined;
    if (cookieVal !== initial) {
      document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(initial)}; path=/; max-age=31536000; samesite=lax`;
      if (cookieVal !== undefined || initial !== DEFAULT_LOCALE) router.refresh();
    }
  }, [router]);

  const setLocale = useCallback(
    (l: Locale) => {
      persistLocale(l);
      // 客户端文案由 context 即时换；服务端渲染的文案（页面正文、metadata）按 cookie 走，刷新 RSC 立即生效
      router.refresh();
    },
    [router],
  );

  const t = useCallback(
    (key: keyof Dict, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** 只要翻译函数的便捷 hook */
export function useT() {
  return useLocale().t;
}

export { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE };
export type { Locale };
export { getDict };
