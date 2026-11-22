import type { NavMessages } from "./nav.zh-CN";

/** 顶栏 + 鍵屏 + 演示角標（繁體） */
export const zhTW: Record<keyof NavMessages, string> = {
  // 頂欄頁籤
  "nav.tab.home": "首頁",
  "nav.tab.journal": "手帳",
  "nav.tab.album": "相簿",
  "nav.tab.quotes": "語錄",
  "nav.tab.letters": "信箱",
  "nav.tab.timeline": "大事記",
  "nav.tab.screenings": "放映室",
  "nav.writeCta": "記一筆",
  "nav.backToWrite": "回到寫作後台",
  "nav.lockAria": "{name}的專屬入口",
  "nav.prev": "上一張",
  "nav.next": "下一張",
  "nav.lockTitle": "{name}的專屬：輸密碼進來",

  // 配色 / 明暗切換
  "nav.palette.label": "切換配色主題",
  "nav.palette.rose": "玫瑰奶油",
  "nav.palette.sakura": "櫻花",
  "nav.palette.lavender": "薰衣草",
  "nav.palette.peach": "蜜桃",
  "nav.theme.toLight": "切換到白天模式",
  "nav.theme.toDark": "切換到夜間模式",

  // 鍵屏 LockForm
  "lock.title.opened": "鎖扣彈開啦",
  "lock.title.closed": "這是{name}的專屬",
  "lock.sub.opened": "封面正在翻開……",
  "lock.sub.closed": "這本手帳大部分內容只給她看，輸密碼就能以她的身分進來",
  "lock.placeholder": "嗯…是哪個日子來著",
  "lock.aria": "解鎖密碼",
  "lock.error.wrong": "密碼好像不對哦，再想想？",
  "lock.error.network": "網路好像打了個盹，再試一次？",
  "lock.cta.opened": "翻開啦",
  "lock.cta.busy": "正在開鎖…",
  "lock.cta.closed": "解開鎖扣",
  "lock.guest": "先隨便逛逛（訪客模式）",
  "lock.psst": "psst. 忘了的話，只有他知道",
  "lock.demoHint": "示範站：解鎖密碼 {password}",
  "lock.close": "合上本子",
  "lock.closing": "正在合上…",
  "lock.guest.title": "「{section}」是{reader}的專屬",
  "lock.guest.sub": "這裡的回憶只給兩個人看。要是有密碼，就進來吧",
  "lock.guest.cta": "輸密碼進入",
  "lock.book.title": "我們的故事",
  "lock.book.openMsg": "翻開啦，都在裡面",
  "lock.book.closeMsg": "合上本子，明天繼續寫",
  "lock.book.coverUs": "我們倆",
  "lock.book.coverJournal": "的手賬",

  // 演示角標 DemoBadge
  "demo.title": "這是公開示範站 🌱",
  "demo.body1":
    "手帳裡的內容都是範例。你寫的、傳的任何東西都只是示範：內容每 {n} 分鐘自動重置，上傳的照片 / 影片 / 語音會換成內建的範例素材，不會真的儲存。",
  "demo.body2": "可以隨便玩：解鎖、寫作、蓋章、回話、拆彩蛋都試試。",
  "demo.pwReader": "解鎖密碼",
  "demo.pwAuthor": "作者口令（/write）",
  "demo.pillOpen": "示範站·收起",
  "demo.pillClosed": "示範站·密碼在這",
};
