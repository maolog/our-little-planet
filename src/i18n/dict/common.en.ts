import type { Messages } from "./common.zh-CN";

/** 通用文案（English）——key must match the zh-CN baseline exactly (type-enforced) */
export const en: Record<keyof Messages, string> = {
  // Actions
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.delete": "Delete",
  "action.edit": "Edit",
  "action.confirm": "OK",
  "action.close": "Close",
  "action.back": "Back",
  "action.retry": "Retry",
  "action.loading": "Loading…",
  "action.saving": "Saving…",
  "action.more": "More",
  "action.copy": "Copy",
  "action.copied": "Copied",
  "action.done": "Done",
  "action.publish": "Publish",
  "action.unpublish": "Unpublish",
  "action.search": "Search",
  "action.clear": "Clear",
  "action.backTop": "Back to top",

  // States
  "state.saveError": "Couldn't save",
  "state.empty": "Nothing here yet",
  "state.noData": "No content yet",
  "state.loading": "Loading…",
  "state.saved": "Saved",
  "state.deleted": "Deleted",
  "state.offline": "You seem to be offline",
  "state.error": "Something went wrong",
  "state.retry": "Try again",
  "state.network": "The network dozed off — try again?",

  // Filters
  "filter.all": "All",

  // Locale / theme switches
  "locale.label": "Switch language",
  "theme.label": "Toggle light / dark",
  "palette.label": "Switch color theme",

  // Time
  "time.justNow": "just now",
  "time.minutesAgo": "{n} min ago",
  "time.hoursAgo": "{n} h ago",
  "time.daysAgo": "{n} d ago",
};
