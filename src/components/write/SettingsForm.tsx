"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FloppyDisk, MusicNotes, Trash, UploadSimple } from "@phosphor-icons/react";
import { useToast } from "@/components/Toast";
import { uploadFile, type MediaDTO } from "@/lib/client-upload";
import type { SiteSettings } from "@/lib/settings";
import { READER_NAME } from "@/lib/reader";
import { MENU_KEYS, PUBLISHABLE_TYPES } from "@/lib/permissionKeys";
import { useT } from "@/i18n/LocaleProvider";

/** 本子信息（彩蛋已独立到「彩蛋」标签页管理） */
export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const toast = useToast();
  const t = useT();
  const [title, setTitle] = useState(initial.title);
  const [names, setNames] = useState(initial.names);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [hideQuoteDate, setHideQuoteDate] = useState(initial.quotesHideDate === "1");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  // 访客模式：六个栏目对不登录的访客是否公开 + 访客进门的一句话
  const [guestOpen, setGuestOpen] = useState({
    home: initial.guestHome === "1",
    journal: initial.guestJournal === "1",
    album: initial.guestAlbum === "1",
    quotes: initial.guestQuotes === "1",
    letters: initial.guestLetters === "1",
    timeline: initial.guestTimeline === "1",
    screenings: initial.guestScreenings === "1",
  });
  const [guestWelcome, setGuestWelcome] = useState(initial.guestWelcome);

  // 她的权限：能发什么（彩蛋永远只有他能发，不在选项里）+ 登录后能看到哪些菜单
  // CSV 解析：老库没存过这两个 key 时 getSettings 会回退到全开的默认值
  const [shePublish, setShePublish] = useState<Record<string, boolean>>(() => {
    const on = new Set(initial.shePublishTypes.split(",").map((s) => s.trim()).filter(Boolean));
    return Object.fromEntries(PUBLISHABLE_TYPES.map((k) => [k, on.has(k)]));
  });
  const [sheMenus, setSheMenus] = useState<Record<string, boolean>>(() => {
    const on = new Set(initial.sheMenuKeys.split(",").map((s) => s.trim()).filter(Boolean));
    return Object.fromEntries(MENU_KEYS.map((k) => [k, on.has(k)]));
  });

  // 背景音乐：新传的先放本地，保存时才落到 settings；换歌/移除的旧文件保存成功后再删
  const [bgmTitle, setBgmTitle] = useState(initial.bgmTitle);
  const [bgmLyrics, setBgmLyrics] = useState(initial.bgmLyrics);
  const [bgmNew, setBgmNew] = useState<MediaDTO | null>(null);
  const [bgmNewName, setBgmNewName] = useState("");
  const [bgmRemoved, setBgmRemoved] = useState(false);
  const [bgmUploading, setBgmUploading] = useState(false);
  const bgmAudioInput = useRef<HTMLInputElement>(null);
  const bgmLrcInput = useRef<HTMLInputElement>(null);
  // 传好了但从没保存的文件：离开表单时删掉，别留在库里当孤儿
  const bgmPendingRef = useRef<MediaDTO | null>(null);
  useEffect(() => {
    bgmPendingRef.current = bgmNew;
  }, [bgmNew]);
  useEffect(() => {
    const pending = bgmPendingRef;
    return () => {
      const dto = pending.current;
      if (dto) void fetch(`/api/media/${dto.id}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
    };
  }, []);

  async function pickBgm(file: File | undefined) {
    if (!file) return;
    if (!(file.type.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(file.name))) {
      toast(t("set.bgmBadFile"), "error");
      return;
    }
    setBgmUploading(true);
    try {
      const dto = await uploadFile(file);
      setBgmNew(dto);
      setBgmNewName(file.name);
      setBgmRemoved(false);
      toast(t("set.bgmUploaded"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("set.bgmUploadFail"), "error");
    } finally {
      setBgmUploading(false);
    }
  }

  async function pickLrc(file: File | undefined) {
    if (!file) return;
    const text = await file.text().catch(() => "");
    if (!text.trim()) {
      toast(t("set.lrcUnreadable"), "error");
      return;
    }
    setBgmLyrics(text.slice(0, 20000));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError("");
    try {
      const bgmMediaId = bgmNew ? bgmNew.id : bgmRemoved ? "" : initial.bgmMediaId;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          names,
          startDate,
          quotesHideDate: hideQuoteDate ? "1" : "0",
          guestHome: guestOpen.home ? "1" : "0",
          guestJournal: guestOpen.journal ? "1" : "0",
          guestAlbum: guestOpen.album ? "1" : "0",
          guestQuotes: guestOpen.quotes ? "1" : "0",
          guestLetters: guestOpen.letters ? "1" : "0",
          guestTimeline: guestOpen.timeline ? "1" : "0",
          guestScreenings: guestOpen.screenings ? "1" : "0",
          guestWelcome: guestWelcome.slice(0, 200),
          shePublishTypes: PUBLISHABLE_TYPES.filter((k) => shePublish[k]).join(","),
          sheMenuKeys: MENU_KEYS.filter((k) => sheMenus[k]).join(","),
          bgmMediaId,
          bgmTitle: bgmTitle.slice(0, 120),
          bgmLyrics: bgmLyrics.slice(0, 20000),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("state.saveError"));
      }
      // 换歌或移除：旧文件已经没有引用，删掉（失败也不影响配置，最多留个孤儿文件）
      const replaced = initial.bgmMediaId && initial.bgmMediaId !== bgmMediaId ? initial.bgmMediaId : null;
      if (replaced) void fetch(`/api/media/${replaced}`, { method: "DELETE" }).catch(() => undefined);
      bgmPendingRef.current = null;
      setState("saved");
      toast(t("set.saved"));
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("state.saveError"));
      setState("error");
      toast(e instanceof Error ? e.message : t("state.saveError"), "error");
    }
  }

  const fieldCls =
    "w-full rounded-2xl border-2 border-ink/10 bg-paper px-4 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-rose";
  const labelCls = "mb-1.5 block text-sm font-bold text-ink-soft";
  const hasBgm = Boolean(bgmNew) || (Boolean(initial.bgmMediaId) && !bgmRemoved);

  return (
    <form onSubmit={submit} className="card-paper max-w-lg space-y-6">
      <div>
        <label className={labelCls} htmlFor="set-title">
          {t("set.title")}
        </label>
        <input id="set-title" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} placeholder={t("set.titlePh")} />
      </div>
      <div>
        <label className={labelCls} htmlFor="set-names">
          {t("set.names")}
        </label>
        <input id="set-names" value={names} onChange={(e) => setNames(e.target.value)} className={fieldCls} placeholder={t("set.namesPh")} />
      </div>
      <div>
        <label className={labelCls} htmlFor="set-date">
          {t("set.startDate")}
        </label>
        <input id="set-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldCls} />
      </div>

      {/* 语录墙隐藏日期：整批导入的语录都是同一天时，墙上一排同日期不好看 */}
      <button
        type="button"
        onClick={() => setHideQuoteDate((v) => !v)}
        aria-pressed={hideQuoteDate}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-ink/10 bg-paper px-4 py-3 text-left transition hover:border-ink/25"
      >
        <span>
          <span className="block text-sm font-bold">{t("set.hideQuoteDate")}</span>
          <span className="mt-0.5 block text-xs text-ink-soft">{t("set.hideQuoteDateDesc")}</span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${hideQuoteDate ? "bg-rose-deep" : "bg-ink/20"}`}
          aria-hidden
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-paper shadow transition-all ${hideQuoteDate ? "left-[22px]" : "left-0.5"}`}
          />
        </span>
      </button>

      {/* 访客模式：哪些栏目不登录也能看。没开的栏目对访客整栏消失（数据也不会渲染） */}
      <fieldset className="rounded-2xl border-2 border-dashed border-mist bg-mist/15 px-4 py-4">
        <legend className="px-1.5 text-sm font-bold text-ink">{t("set.guest")}</legend>
        <p className="mb-3.5 text-xs leading-relaxed text-ink-soft">
          {t("set.guestDesc", { reader: READER_NAME })}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { key: "home", labelKey: "nav.tab.home", descKey: "set.guestHome" },
              { key: "journal", labelKey: "nav.tab.journal", descKey: "set.guestJournal" },
              { key: "album", labelKey: "nav.tab.album", descKey: "set.guestAlbum" },
              { key: "quotes", labelKey: "nav.tab.quotes", descKey: "set.guestQuotes" },
              { key: "letters", labelKey: "nav.tab.letters", descKey: "set.guestLetters" },
              { key: "timeline", labelKey: "nav.tab.timeline", descKey: "set.guestTimeline" },
              { key: "screenings", labelKey: "nav.tab.screenings", descKey: "set.guestScreenings" },
            ] as const
          ).map(({ key, labelKey, descKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setGuestOpen((s) => ({ ...s, [key]: !s[key] }))}
              aria-pressed={guestOpen[key]}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-paper px-3.5 py-2.5 text-left transition hover:border-ink/25"
            >
              <span>
                <span className="block text-sm font-bold">{t(labelKey)}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{t(descKey)}</span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${guestOpen[key] ? "bg-rose-deep" : "bg-ink/20"}`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-paper shadow transition-all ${guestOpen[key] ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3.5">
          <label className={labelCls} htmlFor="set-guest-welcome">
            {t("set.guestWelcome")}
          </label>
          <input
            id="set-guest-welcome"
            value={guestWelcome}
            onChange={(e) => setGuestWelcome(e.target.value.slice(0, 200))}
            className={fieldCls}
            placeholder={t("set.guestWelcomePh")}
            maxLength={200}
          />
        </div>
      </fieldset>

      {/* 她的权限：她登录后能发什么、能看到哪些菜单（写一页的类型卡和接口都按这套拦） */}
      <fieldset className="rounded-2xl border-2 border-dashed border-matcha/50 bg-matcha/10 px-4 py-4">
        <legend className="px-1.5 text-sm font-bold text-ink">{t("set.she")}</legend>
        <p className="mb-3.5 text-xs leading-relaxed text-ink-soft">{t("set.sheDesc", { reader: READER_NAME })}</p>

        <p className="mb-2 text-sm font-bold text-ink-soft">{t("set.shePublish")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { key: "journal", labelKey: "ef.type.journal", descKey: "ef.type.journalHint" },
              { key: "photo", labelKey: "ef.type.photo", descKey: "ef.type.photoHint" },
              { key: "quote", labelKey: "ef.type.quote", descKey: "ef.type.quoteHint" },
              { key: "letter", labelKey: "ef.type.letter", descKey: "ef.type.letterHint" },
              { key: "milestone", labelKey: "ef.type.milestone", descKey: "ef.type.milestoneHint" },
              { key: "screening", labelKey: "ef.type.screening", descKey: "ef.type.screeningHint" },
            ] as const
          ).map(({ key, labelKey, descKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setShePublish((s) => ({ ...s, [key]: !s[key] }))}
              aria-pressed={shePublish[key]}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-paper px-3.5 py-2.5 text-left transition hover:border-ink/25"
            >
              <span>
                <span className="block text-sm font-bold">{t(labelKey)}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{t(descKey)}</span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${shePublish[key] ? "bg-rose-deep" : "bg-ink/20"}`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-paper shadow transition-all ${shePublish[key] ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 text-sm font-bold text-ink-soft">{t("set.sheMenus")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { key: "home", labelKey: "nav.tab.home", descKey: "set.guestHome" },
              { key: "journal", labelKey: "nav.tab.journal", descKey: "set.guestJournal" },
              { key: "album", labelKey: "nav.tab.album", descKey: "set.guestAlbum" },
              { key: "quotes", labelKey: "nav.tab.quotes", descKey: "set.guestQuotes" },
              { key: "letters", labelKey: "nav.tab.letters", descKey: "set.guestLetters" },
              { key: "timeline", labelKey: "nav.tab.timeline", descKey: "set.guestTimeline" },
              { key: "screenings", labelKey: "nav.tab.screenings", descKey: "set.guestScreenings" },
              { key: "write", labelKey: "wd.tabWrite", descKey: "set.sheMenuWrite" },
              { key: "list", labelKey: "wd.tabAll", descKey: "set.sheMenuList" },
              { key: "marks", labelKey: "meta.marks", descKey: "set.sheMenuMarks" },
            ] as const
          ).map(({ key, labelKey, descKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSheMenus((s) => ({ ...s, [key]: !s[key] }))}
              aria-pressed={sheMenus[key]}
              className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/10 bg-paper px-3.5 py-2.5 text-left transition hover:border-ink/25"
            >
              <span>
                <span className="block text-sm font-bold">{t(labelKey)}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{t(descKey)}</span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${sheMenus[key] ? "bg-rose-deep" : "bg-ink/20"}`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-paper shadow transition-all ${sheMenus[key] ? "left-[22px]" : "left-0.5"}`}
                />
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {/* 大事记的背景音乐：自托管一首 mp3 + LRC 歌词 */}
      <fieldset className="rounded-2xl border-2 border-dashed border-rose/40 bg-rose-soft/25 px-4 py-4">
        <legend className="px-1.5 text-sm font-bold text-rose-deep">{t("set.bgm")}</legend>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasBgm ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-sm font-bold text-ink shadow-sm">
                <MusicNotes weight="fill" className="size-4 text-rose-deep" />
                {bgmNew ? t("set.bgmNew", { name: bgmNewName }) : t("set.bgmExisting")}
              </span>
              <button
                type="button"
                onClick={() => bgmAudioInput.current?.click()}
                disabled={bgmUploading}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink-soft transition hover:bg-ink/5"
              >
                <UploadSimple weight="bold" className="size-4" />
                {t("set.bgmSwap")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBgmRemoved(true);
                  setBgmNew(null);
                  setBgmNewName("");
                }}
                disabled={bgmUploading}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-sm text-ink-soft transition hover:bg-ink/5"
              >
                <Trash weight="bold" className="size-4" />
                {t("set.bgmRemove")}
              </button>
            </>
          ) : bgmRemoved && initial.bgmMediaId ? (
            <span className="text-sm text-ink-soft">{t("set.bgmNone")}</span>
          ) : (
            <button
              type="button"
              onClick={() => bgmAudioInput.current?.click()}
              disabled={bgmUploading}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-deep px-3.5 py-1.5 text-sm font-bold text-paper shadow-sm transition hover:-translate-y-0.5"
            >
              <UploadSimple weight="bold" className="size-4" />
              {bgmUploading ? t("set.bgmUploading") : t("set.bgmUpload")}
            </button>
          )}
          <input
            ref={bgmAudioInput}
            type="file"
            accept="audio/*,.mp3,.m4a,.flac,.wav,.ogg"
            className="hidden"
            onChange={(e) => {
              void pickBgm(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-3.5">
          <label className={labelCls} htmlFor="set-bgm-title">
            {t("set.bgmTitle")}
          </label>
          <input
            id="set-bgm-title"
            value={bgmTitle}
            onChange={(e) => setBgmTitle(e.target.value)}
            className={fieldCls}
            placeholder={t("set.bgmTitlePh")}
            maxLength={120}
          />
        </div>

        <div className="mt-3.5">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${labelCls} mb-0`} htmlFor="set-bgm-lyrics">
              {t("set.bgmLyrics")}
            </label>
            <button
              type="button"
              onClick={() => bgmLrcInput.current?.click()}
              className="text-xs font-bold text-rose-deep underline-offset-2 hover:underline"
            >
              {t("set.bgmPickLrc")}
            </button>
          </div>
          <textarea
            id="set-bgm-lyrics"
            value={bgmLyrics}
            onChange={(e) => setBgmLyrics(e.target.value.slice(0, 20000))}
            rows={5}
            className={`${fieldCls} resize-y font-mono text-xs leading-relaxed`}
            placeholder={t("set.bgmLyricsPh")}
          />
          <p className="mt-1.5 text-xs text-ink-soft">{t("set.bgmHint")}</p>
          <input
            ref={bgmLrcInput}
            type="file"
            accept=".lrc,text/plain"
            className="hidden"
            onChange={(e) => {
              void pickLrc(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </fieldset>

      {error && <p className="rounded-xl bg-rose-soft px-4 py-3 text-sm font-bold text-rose-deep">{error}</p>}

      <button type="submit" disabled={state === "saving"} className="btn-primary">
        {state === "saved" ? (
          <>
            <Check weight="bold" className="size-5" />
            {t("state.saved")}
          </>
        ) : (
          <>
            <FloppyDisk weight="bold" className="size-5" />
            {state === "saving" ? t("action.saving") : t("action.save")}
          </>
        )}
      </button>
    </form>
  );
}
