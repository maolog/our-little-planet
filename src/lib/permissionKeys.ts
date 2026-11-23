/** 她的权限词表（发表类型 / 菜单项）。
 *  单独拆成一个不碰数据库的小模块：SettingsForm 是客户端组件，
 *  不能把 permissions.ts（连带 settings.ts → db.ts）打进浏览器包。
 *  判定逻辑仍在 permissions.ts，这里只有常量。 */

/** 她能发表的内容类型全集（不含 egg——彩蛋永远只有他能发） */
export const PUBLISHABLE_TYPES = ["journal", "photo", "quote", "letter", "milestone", "screening"] as const;
export type PublishType = (typeof PUBLISHABLE_TYPES)[number];

/** 她登录后能看到哪些导航栏目（guest 的开关是 sections，她的是这里）；后三项是写作台入口 */
export const MENU_KEYS = [
  "home",
  "calendar",
  "milestones",
  "timeline",
  "photos",
  "notes",
  "screenings",
  "write",
  "list",
  "marks",
] as const;
export type MenuKey = (typeof MENU_KEYS)[number];
