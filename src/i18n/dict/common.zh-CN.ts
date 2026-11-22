/** 通用文案（简体中文为 key 的基准语言）。
 *  新增 namespace 时：建 common.zh-CN.ts 式的三件套，
 *  zh-TW / en 用 Record<keyof typeof zhCN, string> 强制 key 对齐。 */

export const zhCN = {
  // 通用按钮 / 动作
  "action.save": "保存",
  "action.cancel": "取消",
  "action.delete": "删除",
  "action.edit": "编辑",
  "action.confirm": "确定",
  "action.close": "关闭",
  "action.back": "返回",
  "action.retry": "重试",
  "action.loading": "加载中…",
  "action.saving": "保存中…",
  "action.more": "更多",
  "action.copy": "复制",
  "action.copied": "已复制",
  "action.done": "完成",
  "action.publish": "发布",
  "action.unpublish": "设为草稿",
  "action.search": "搜索",
  "action.clear": "清空",
  "action.backTop": "回到最上方",

  // 通用状态
  "state.saveError": "保存失败",
  "state.empty": "这里还空空的",
  "state.noData": "暂无内容",
  "state.loading": "加载中…",
  "state.saved": "已保存",
  "state.deleted": "已删除",
  "state.offline": "网络好像断开了",
  "state.error": "出了点小问题",
  "state.retry": "再试一次",
  "state.network": "网络好像打了个盹，再试一次？",

  // 筛选
  "filter.all": "全部",

  // 语言 / 主题切换
  "locale.label": "切换语言",
  "theme.label": "切换明暗",
  "palette.label": "切换配色主题",

  // 时间
  "time.justNow": "刚刚",
  "time.minutesAgo": "{n} 分钟前",
  "time.hoursAgo": "{n} 小时前",
  "time.daysAgo": "{n} 天前",
} as const;

export type Messages = typeof zhCN;
