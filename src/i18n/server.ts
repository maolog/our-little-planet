import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { translate, type Dict } from "./index";

/** 服务端取当前语言：cookie（由 LocaleProvider 写入）→ 默认简体 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  const decoded = raw ? safeDecode(raw) : undefined;
  return isLocale(decoded) ? decoded : DEFAULT_LOCALE;
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** 服务端翻译（API route 错误消息按语言返回用） */
export async function serverT(key: keyof Dict, params?: Record<string, string | number>): Promise<string> {
  return translate(await getLocale(), key, params);
}

/** 已知 locale 时的同步翻译（route 里先取过 locale 的场景） */
export function tWith(locale: Locale, key: keyof Dict, params?: Record<string, string | number>): string {
  return translate(locale, key, params);
}
