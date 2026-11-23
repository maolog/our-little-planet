import type { NavMessages } from "./nav.zh-CN";

/** Top nav + lock screen + demo badge (English) */
export const en: Record<keyof NavMessages, string> = {
  // Tabs
  "nav.tab.home": "Home",
  "nav.tab.journal": "Journal",
  "nav.tab.album": "Album",
  "nav.tab.quotes": "Quotes",
  "nav.tab.letters": "Letters",
  "nav.tab.timeline": "Milestones",
  "nav.tab.screenings": "Screenings",
  "nav.writeCta": "Write",
  "nav.backToWrite": "Back to the writing desk",
  "nav.lockAria": "{name}'s private entrance",
  "nav.prev": "Previous",
  "nav.next": "Next",
  "nav.lockTitle": "{name}'s private journal: enter the password",

  // Palette / theme toggles
  "nav.palette.label": "Switch color theme",
  "nav.palette.rose": "Rose Cream",
  "nav.palette.sakura": "Sakura",
  "nav.palette.lavender": "Lavender",
  "nav.palette.peach": "Peach",
  "nav.theme.toLight": "Switch to light mode",
  "nav.theme.toDark": "Switch to dark mode",

  // Lock form
  "lock.title.opened": "The clasp popped open!",
  "lock.title.closed": "This is {name}'s private journal",
  "lock.sub.opened": "Opening the cover…",
  "lock.sub.closed":
    "Most of this journal is for her only — enter the password to come in as her",
  "lock.placeholder": "Hmm… which day was it again",
  "lock.aria": "Unlock password",
  "lock.error.wrong": "That doesn't look right — try again?",
  "lock.error.network": "The network took a nap — try again?",
  "lock.cta.opened": "Opening!",
  "lock.cta.busy": "Unlocking…",
  "lock.cta.closed": "Undo the clasp",
  "lock.guest": "Just looking around (guest mode)",
  "lock.psst": "psst. if you forgot, only he knows",
  "lock.demoHint": "Demo site — unlock password: {password}",
  "lock.close": "Close the book",
  "lock.closing": "Closing…",
  "lock.guest.title": "“{section}” is {reader}'s space",
  "lock.guest.sub": "These memories are just for the two of us. If you have the password, come on in",
  "lock.guest.cta": "Enter with password",
  "lock.book.title": "Our story",
  "lock.book.openMsg": "Opened — it's all here",
  "lock.book.closeMsg": "Close the book, write again tomorrow",
  "lock.book.coverUs": "Our",
  "lock.book.coverJournal": "shared journal",

  // Hidden writing desk form (/desk)
  "desk.title": "This door leads to the writing desk",
  "desk.sub": "He and she each have a key — pick an identity, then enter the password",
  "desk.pick.he": "I'm him (author pass)",
  "desk.pick.she": "I'm her (reader password)",
  "desk.chosen.he": "Enter as him",
  "desk.chosen.she": "Enter as her",
  "desk.placeholder": "Hmm… that secret phrase",
  "desk.aria": "Password for this identity",
  "desk.remember": "This device is mine (no need to type it for 30 days)",
  "desk.cta": "That's me — open up",
  "desk.busy": "Opening the door…",
  "desk.back": "Pick another identity",
  "desk.error.wrong": "That doesn't look right — try again?",
  "desk.error.network": "The network took a nap — try again?",
  "desk.guest": "Just looking around (guest mode)",
  "desk.psst": "psst. two keys, and only he knows them",
  "desk.demoHint": "Demo site — his pass {he} · her password {she}",

  // Demo badge
  "demo.title": "This is a public demo 🌱",
  "demo.body1":
    "Everything in this journal is sample content. Whatever you write or upload is just a demo: content resets every {n} minutes, and uploaded photos / videos / voice notes are swapped with built-in samples — nothing is really saved.",
  "demo.body2": "Feel free to play: unlock, write, stamp, reply, crack the easter eggs.",
  "demo.pwReader": "Unlock password",
  "demo.pwAuthor": "Author pass (/write)",
  "demo.pillOpen": "Demo · collapse",
  "demo.pillClosed": "Demo · passwords here",
};
