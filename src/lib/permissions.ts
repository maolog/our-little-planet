import { getSettings, type SiteSettings } from "./settings";
import { MENU_KEYS, PUBLISHABLE_TYPES } from "./permissionKeys";

// 词表拆在 permissionKeys.ts（客户端组件 SettingsForm 也要用同一份）；这里继续对外提供，老 import 路径不断
export { MENU_KEYS, PUBLISHABLE_TYPES } from "./permissionKeys";
export type { MenuKey, PublishType } from "./permissionKeys";

/** 把 CSV 字串解析成 Set（去空白、去重、只留已知 key） */
function parseCsv(csv: string, known: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const raw of csv.split(",")) {
    const k = raw.trim();
    if (k && known.includes(k)) out.add(k);
  }
  return out;
}

/** 她可以发表的内容类型（settings.shePublishTypes 解析结果） */
export function shePublishTypes(settings?: SiteSettings): Set<string> {
  return parseCsv((settings ?? getSettings()).shePublishTypes, PUBLISHABLE_TYPES);
}

/** 她登录后可见的菜单项（settings.sheMenuKeys 解析结果） */
export function sheMenuKeys(settings?: SiteSettings): Set<string> {
  return parseCsv((settings ?? getSettings()).sheMenuKeys, MENU_KEYS);
}

/** 她能不能发某个类型（type需为 entries 的 type 字段值）
 *  自由拼贴页（board）是手账页的另一种写法，不在设置词表里，按「手账页」的权限算 */
export function canShePublish(type: string, settings?: SiteSettings): boolean {
  if (type === "egg") return false; // 彩蛋永远只有他能发
  return shePublishTypes(settings).has(type === "board" ? "journal" : type);
}

/** 她登录后能不能看到某个菜单项 */
export function canSheSee(key: string, settings?: SiteSettings): boolean {
  return sheMenuKeys(settings).has(key);
}
