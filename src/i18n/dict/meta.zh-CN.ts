/** 站点 metadata（标题 / 描述）——简体基准 */
export const zhCN = {
  "meta.siteTitle": "我们的小星球",
  "meta.siteTitleTemplate": "%s · 我们的小星球",
  "meta.siteDescription": "一本只属于我们俩的手账",
  "meta.letters": "信箱",
  "meta.quotes": "语录墙",
  "meta.timeline": "大事记",
  "meta.screenings": "放映室",
  "meta.marks": "她的痕迹",
  "meta.schedule": "排片 · 放映室",
  "meta.visitors": "访客记录",
  "meta.someday": "Someday",
} as const;

export type MetaMessages = typeof zhCN;
