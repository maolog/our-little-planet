import type { Messages } from "./common.zh-CN";

/** 通用文案（繁體中文）——key 必须与简体基准完全一致（类型强制） */
export const zhTW: Record<keyof Messages, string> = {
  // 通用按鈕 / 動作
  "action.save": "儲存",
  "action.cancel": "取消",
  "action.delete": "刪除",
  "action.edit": "編輯",
  "action.confirm": "確定",
  "action.close": "關閉",
  "action.back": "返回",
  "action.retry": "重試",
  "action.loading": "載入中…",
  "action.saving": "儲存中…",
  "action.more": "更多",
  "action.copy": "複製",
  "action.copied": "已複製",
  "action.done": "完成",
  "action.publish": "發布",
  "action.unpublish": "設為草稿",
  "action.search": "搜尋",
  "action.clear": "清空",
  "action.backTop": "回到最上方",

  // 通用狀態
  "state.saveError": "儲存失敗",
  "state.empty": "這裡還空空的",
  "state.noData": "暫無內容",
  "state.loading": "載入中…",
  "state.saved": "已儲存",
  "state.deleted": "已刪除",
  "state.offline": "網路好像斷開了",
  "state.error": "出了點小問題",
  "state.retry": "再試一次",
  "state.network": "網路好像打了個盹，再試一次？",

  // 篩選
  "filter.all": "全部",

  // 語言 / 主題切換
  "locale.label": "切換語言",
  "theme.label": "切換明暗",
  "palette.label": "切換配色主題",

  // 時間
  "time.justNow": "剛剛",
  "time.minutesAgo": "{n} 分鐘前",
  "time.hoursAgo": "{n} 小時前",
  "time.daysAgo": "{n} 天前",
};
