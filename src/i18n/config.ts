/** 语言配置：默认简体中文，支持繁体中文与英文。
 *  私人手账不做 URL 段式 i18n，语言存 localStorage + cookie，
 *  cookie 让 API route 在服务端也能按语言返回错误消息。 */

export const LOCALES = ["zh-CN", "zh-TW", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const LOCALE_LABELS: Record<Locale, string> = {
  "zh-CN": "简体",
  "zh-TW": "繁體",
  en: "EN",
};

export const LOCALE_STORAGE_KEY = "journal-locale";
export const LOCALE_COOKIE = "locale";

export const LOCALE_HTML_LANG: Record<Locale, string> = {
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  en: "en",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
