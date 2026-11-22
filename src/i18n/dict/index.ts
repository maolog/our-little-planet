import type { Locale } from "../config";
import { zhCN as commonZhCN, type Messages as CommonMessages } from "./common.zh-CN";
import { zhTW as commonZhTW } from "./common.zh-TW";
import { en as commonEn } from "./common.en";
import { zhCN as metaZhCN, type MetaMessages } from "./meta.zh-CN";
import { zhTW as metaZhTW } from "./meta.zh-TW";
import { en as metaEn } from "./meta.en";
import { zhCN as navZhCN, type NavMessages } from "./nav.zh-CN";
import { zhTW as navZhTW } from "./nav.zh-TW";
import { en as navEn } from "./nav.en";
import { zhCN as homeZhCN, type HomeMessages } from "./home.zh-CN";
import { zhTW as homeZhTW } from "./home.zh-TW";
import { en as homeEn } from "./home.en";
import { zhCN as mediaZhCN, type MediaMessages } from "./media.zh-CN";
import { zhTW as mediaZhTW } from "./media.zh-TW";
import { en as mediaEn } from "./media.en";
import { zhCN as writeZhCN, type WriteMessages } from "./write.zh-CN";
import { zhTW as writeZhTW } from "./write.zh-TW";
import { en as writeEn } from "./write.en";

/** 各 namespace 的基准字典合并在这里；新增 namespace 时加三行 import + spread。
 *  zh-TW / en 各文件用 Record<keyof XxxMessages, string> 约束，
 *  基准加了 key 而翻译没跟上 → 编译期报错。 */

export type Dict = Record<
  | keyof CommonMessages
  | keyof MetaMessages
  | keyof NavMessages
  | keyof HomeMessages
  | keyof MediaMessages
  | keyof WriteMessages,
  string
>;

const zhCNMerged: Dict = {
  ...commonZhCN,
  ...metaZhCN,
  ...navZhCN,
  ...homeZhCN,
  ...mediaZhCN,
  ...writeZhCN,
};

const zhTWMerged: Dict = {
  ...commonZhTW,
  ...metaZhTW,
  ...navZhTW,
  ...homeZhTW,
  ...mediaZhTW,
  ...writeZhTW,
};

const enMerged: Dict = {
  ...commonEn,
  ...metaEn,
  ...navEn,
  ...homeEn,
  ...mediaEn,
  ...writeEn,
};

export const DICTS: Record<Locale, Dict> = {
  "zh-CN": zhCNMerged,
  "zh-TW": zhTWMerged,
  en: enMerged,
};
