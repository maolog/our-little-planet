/** 她的权限词表（发表类型 / 菜单项）。
 *  单独拆成一个不碰数据库的小模块：SettingsForm 是客户端组件，
 *  不能把 permissions.ts（连带 settings.ts → db.ts）打进浏览器包。
 *  判定逻辑仍在 permissions.ts，这里只有常量。 */

/** 她能发表的内容类型全集（不含 egg——彩蛋永远只有他能发） */
export const PUBLISHABLE_TYPES = ["journal", "photo", "quote", "letter", "milestone", "screening"] as const;
export type PublishType = (typeof PUBLISHABLE_TYPES)[number];

/** 导航栏目词表：与顶部导航 TABS 的 section、settings.ts 的 SECTIONS 是同一套词
 *  （顺序即导航顺序）。拆在这里是为了让客户端组件（SettingsForm/TopNav）
 *  不必 import settings.ts（它连着 db.ts，进不了浏览器包）。 */
export const NAV_KEYS = ["home", "journal", "album", "quotes", "letters", "timeline", "screenings"] as const;
export type NavKey = (typeof NAV_KEYS)[number];

/** 她登录后能看到哪些菜单（sheMenuKeys 存的 CSV 词表）：
 *  导航栏目 + 写作台入口（write/list/marks 三项）。
 *  必须与 NAV_KEYS 同构——否则 SettingsForm 勾选的栏目在保存/读取时会被
 *  parseCsv 过滤丢掉，导航（TopNav 按 section 匹配）也永远匹配不上。 */
export const MENU_KEYS = [...NAV_KEYS, "write", "list", "marks"] as const;
export type MenuKey = (typeof MENU_KEYS)[number];
