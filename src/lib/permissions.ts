import { getSettings, type SiteSettings } from "./settings";

/** 她能发表的内容类型全集（不含 egg——彩蛋永远只有他能发） */
export const PUBLISHABLE_TYPES = [
  "journal",
  "photo",
  "quote",
  "letter",
  "milestone",
  "screening",
] as const;
export type PublishType = (typeof PUBLISHABLE_TYPES)[number];

/** 她登录后可见的菜单项全集：导航栏目 + 写作台入口 */
export const MENU_KEYS = [
  "home",
  "journal",
  "album",
  "quotes",
  "letters",
  "timeline",
  "screenings",
  "write",
  "list",
  "marks",
] as const;
export type MenuKey = (typeof MENU_KEYS)[number];

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

/** 她能不能发某个类型（type需为 entries 的 type 字段值） */
export function canShePublish(type: string, settings?: SiteSettings): boolean {
  if (type === "egg") return false; // 彩蛋永远只有他能发
  return shePublishTypes(settings).has(type);
}

/** 她登录后能不能看到某个菜单项 */
export function canSheSee(key: string, settings?: SiteSettings): boolean {
  return sheMenuKeys(settings).has(key);
}
