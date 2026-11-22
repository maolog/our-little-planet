import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTS, type Dict } from "./dict";

export type { Dict } from "./dict";
export type { Locale } from "./config";
export { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE } from "./config";

/** 取某语言的字典；缺失时回落简体 */
export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

/** 插值：{name} 占位替换 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) =>
    Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m,
  );
}

/** 翻译：按 key 查字典，找不到原样返回 key（便于发现漏翻） */
export function translate(locale: Locale, key: keyof Dict, params?: Record<string, string | number>): string {
  const dict = getDict(locale);
  const template = dict[key] ?? DICTS[DEFAULT_LOCALE][key] ?? String(key);
  return interpolate(template, params);
}
