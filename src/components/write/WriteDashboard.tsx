"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChatTeardropText,
  Check,
  CheckCircle,
  Checks,
  Circle,
  Copy,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  FilmSlate,
  FlagBanner,
  GearSix,
  Gift,
  GlobeHemisphereWest,
  HeartStraight,
  Images,
  Notebook,
  PencilSimple,
  SpinnerGap,
  Stack,
  Sticker,
  TrashSimple,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/Toast";
import type { SiteSettings } from "@/lib/settings";
import type { BoardLayout } from "@/lib/board";
import { MAX_TAGS_PER_ENTRY, tagColor } from "@/lib/tags";
import { Sticker as StickerBadge, STICKER_NAMES, type StickerName } from "@/components/journal/Sticker";
import { EntryForm, type EntryDTO, type FormKind } from "./EntryForm";
import { BoardEditor } from "./BoardEditor";
import { SettingsForm } from "./SettingsForm";
import { TagDropdown } from "./TagDropdown";
import { Lightbox, type LightboxPhoto } from "@/components/album/Lightbox";
import { EggForm, isEggArrived, type EggDTO } from "./EggManager";
import { MilestoneForm, type AlbumPickItem, type MilestoneDTO } from "./MilestoneManager";
import { ScreeningForm } from "@/components/screenings/ScreeningManager";
import type { Screening } from "@/lib/screenings";
import { READER_NAME } from "@/lib/reader";
import { useT } from "@/i18n/LocaleProvider";
import type { Dict } from "@/i18n/dict";

type DictKey = keyof Dict;

const TYPE_META: Record<EntryDTO["type"], { labelKey: DictKey; icon: typeof Notebook; cls: string }> = {
  journal: { labelKey: "wd.type.journal", icon: Notebook, cls: "bg-matcha text-ink" },
  photo: { labelKey: "wd.type.photo", icon: Images, cls: "bg-mist text-ink" },
  quote: { labelKey: "wd.type.quote", icon: ChatTeardropText, cls: "bg-peach text-ink" },
  letter: { labelKey: "wd.type.letter", icon: EnvelopeSimple, cls: "bg-rose-soft text-rose-deep" },
  board: { labelKey: "wd.type.board", icon: Sticker, cls: "bg-butter text-ink" },
};

/** 本子里的一切：筛选分类（手账含自由拼贴页） */
const FILTERS = [
  { value: "all", labelKey: "wd.filter.all" },
  { value: "journal", labelKey: "wd.filter.journal" },
  { value: "photo", labelKey: "wd.filter.photo" },
  { value: "quote", labelKey: "wd.filter.quote" },
  { value: "letter", labelKey: "wd.filter.letter" },
  { value: "milestone", labelKey: "wd.filter.milestone" },
  { value: "screening", labelKey: "wd.filter.screening" },
  { value: "egg", labelKey: "wd.filter.egg" },
] as const;
type FilterValue = (typeof FILTERS)[number]["value"];

/** 统一列表的行：条目 / 大事记 / 彩蛋 摊成同一种形状（t 是判别字段，kind 是筛选用分类） */
type Row =
  | { t: "entry"; kind: FilterValue; date: string; entry: EntryDTO }
  | { t: "milestone"; kind: "milestone"; date: string; milestone: MilestoneDTO }
  | { t: "screening"; kind: "screening"; date: string; screening: Screening }
  | { t: "egg"; kind: "egg"; date: string; egg: EggDTO };

type Tab = "write" | "list" | "settings";
const TAB_KEYS: Tab[] = ["write", "list", "settings"];
/** /write?type=photo 从各菜单页的添加按钮直达对应新增模块 */
const TYPE_KEYS: FormKind[] = ["journal", "photo", "quote", "letter", "milestone", "screening", "egg"];

/** 列表行左侧的缩略图：有照片/视频就显示首图，没有就退回类型图标 */
function ListThumb({ entry, meta }: { entry: EntryDTO; meta: { labelKey: DictKey; icon: typeof Notebook; cls: string } }) {
  const Icon = meta.icon;
  const cover = entry.media.find((m) => m.kind === "photo") ?? entry.media.find((m) => m.kind === "video");
  if (!cover) {
    return (
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", meta.cls)}>
        <Icon weight="fill" className="size-5" />
      </span>
    );
  }
  if (cover.kind === "video") {
    // 有服务端抽的封面就直接用图（不用拉视频元信息，HEVC 也不会黑块），没有再退首帧
    return cover.posterUrl ? (
      /* eslint-disable-next-line @next/next/no-img-element -- 视频封面，带鉴权的接口地址 */
      <img
        src={cover.posterUrl}
        alt=""
        loading="lazy"
        className="size-11 shrink-0 rounded-xl border border-ink/10 bg-ink/5 object-cover"
      />
    ) : (
      <video
        src={`${cover.url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden
        className="size-11 shrink-0 rounded-xl border border-ink/10 bg-ink/5 object-cover"
      />
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- 缩略图走带鉴权的 /api/media，next/image 不适用 */
    <img
      src={cover.url}
      alt=""
      loading="lazy"
      className="size-11 shrink-0 rounded-xl border border-ink/10 bg-ink/5 object-cover"
    />
  );
}

function isScheduled(e: EntryDTO): boolean {
  return Boolean(e.reveal_at && e.reveal_at > new Date().toLocaleDateString("en-CA"));
}

/** ISO 时间 → 「YYYY.MM.DD HH:MM」。固定按东八区算，谁的机器打开都一样
 *  （服务端渲染和客户端水合结果一致，不会闪一下跳时区） */
function fmtCST(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const t = new Date(d.getTime() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getUTCFullYear()}.${p(t.getUTCMonth() + 1)}.${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

/** 批量模式的行首勾选圆钮 */
function PickBox({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={on}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full border-2 transition",
        on ? "border-rose-deep bg-rose-deep text-paper" : "border-ink/25 text-transparent hover:border-rose-deep"
      )}
    >
      <Check weight="bold" className="size-3.5" />
    </button>
  );
}

/** 本子里的一切 · 按张管理：每一张照片/视频一行，当场改描述、挪日期、贴标签，改完自动存 */
function MediaRow({
  item,
  tagLib,
  onPatched,
  onOpen,
  onDelete,
}: {
  item: AlbumPickItem;
  tagLib: string[];
  onPatched: (id: string, patch: Partial<AlbumPickItem>) => void;
  /** 点缩略图放大看 */
  onOpen?: () => void;
  /** 删掉这张（连缩略图/Live 配对一起） */
  onDelete?: () => void;
}) {
  const toast = useToast();
  const t = useT();
  const [caption, setCaption] = useState(item.caption ?? "");
  const [date, setDate] = useState(item.entryDate ?? "");
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [tagFocus, setTagFocus] = useState(false);
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>, okMsg?: string) {
    setSaving(true);
    const res = await fetch(`/api/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setSaving(false);
    if (res && res.ok) {
      if (okMsg) toast(okMsg);
      return true;
    }
    toast(t("wd.saveFail"), "error");
    return false;
  }

  async function saveCaption() {
    if (caption === (item.caption ?? "")) return;
    if (await patch({ caption }, t("wd.saveCaptionOk"))) onPatched(item.id, { caption: caption || null });
  }

  async function saveDate(next: string) {
    if (!next || next === (item.entryDate ?? "")) return;
    if (await patch({ entryDate: next }, t("wd.saveDateOk", { date: next.replaceAll("-", ".") }))) onPatched(item.id, { entryDate: next });
  }

  async function saveTags(next: string[]) {
    setTags(next);
    if (next.join("\u0000") === (item.tags ?? []).join("\u0000")) return;
    if (await patch({ tags: next })) onPatched(item.id, { tags: next });
  }

  return (
    <div className="card-paper flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        aria-label={item.caption ?? t("wd.rowZoom")}
        title={t("wd.rowZoom")}
        className="relative grid size-14 shrink-0 cursor-zoom-in place-items-center overflow-hidden rounded-lg border border-ink/10 bg-ink/5 transition hover:opacity-85"
      >
        {item.kind === "video" ? (
          <>
            {item.posterUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- 视频封面，带鉴权的接口地址 */
              <img src={item.posterUrl} alt="" className="size-14 object-cover" />
            ) : (
              <VideoCamera weight="duotone" className="size-5 text-ink-soft" />
            )}
            <span className="absolute bottom-0.5 right-0.5 rounded bg-ink/60 px-1 text-[9px] font-bold text-paper">{t("wd.rowVideo")}</span>
          </>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- 缩略图走带鉴权的 /api/media */
          <img src={item.thumbUrl ?? item.url} alt="" loading="lazy" className="size-14 object-cover" />
        )}
      </button>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => void saveCaption()}
        placeholder={t("wd.captionPh")}
        className="min-w-32 flex-1 basis-48 rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5 font-script text-lg leading-tight outline-none placeholder:font-hand placeholder:text-sm placeholder:text-ink-soft/50 focus:border-rose"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          void saveDate(e.target.value);
        }}
        aria-label={t("wd.rowDate")}
        className="rounded-full border border-ink/15 bg-paper px-2.5 py-1 font-round text-xs tracking-wider outline-none focus:border-rose"
      />
      {item.createdAt && (
        <span title={t("wd.uploadedTitle", { time: fmtCST(item.createdAt) })} className="shrink-0 font-round text-[10px] tracking-wider text-ink-soft/60">
          {t("wd.uploadedAt", { time: fmtCST(item.createdAt) })}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tg) => (
          <span key={tg} className="flex items-center gap-1 rounded-full px-2 py-0.5 font-hand text-sm text-ink" style={{ background: tagColor(tg) }}>
            {tg}
            <button type="button" onClick={() => void saveTags(tags.filter((x) => x !== tg))} aria-label={t("wd.removeTag", { name: tg })} className="grid size-3.5 place-items-center rounded-full bg-ink/10 transition hover:bg-ink/25">
              <X className="size-2" weight="bold" />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS_PER_ENTRY && (
          <div className="relative">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onFocus={() => setTagFocus(true)}
              onBlur={() => window.setTimeout(() => setTagFocus(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === "，") {
                  e.preventDefault();
                  const t = tagDraft.trim().slice(0, 20).trim();
                  setTagDraft("");
                  if (t && !tags.includes(t)) void saveTags([...tags, t]);
                }
              }}
              placeholder={t("wd.tagPh")}
              className="w-24 rounded-full border border-dashed border-ink/25 bg-transparent px-2 py-0.5 font-hand text-sm text-ink-soft outline-none placeholder:text-xs placeholder:text-ink-soft/50 focus:border-rose"
            />
            {tagFocus && (
              <TagDropdown
                all={tagLib}
                exclude={tags}
                typed={tagDraft}
                onPick={(tg) => {
                  setTagDraft("");
                  void saveTags([...tags, tg]);
                }}
              />
            )}
          </div>
        )}
      </div>
      {saving && <SpinnerGap className="size-3.5 shrink-0 animate-spin text-ink-soft" />}
      {onDelete && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("wd.rowDelConfirm"))) onDelete();
          }}
          aria-label={t("wd.rowDelTitle")}
          title={t("wd.rowDelTitle")}
          className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
        >
          <TrashSimple className="size-4" />
        </button>
      )}
    </div>
  );
}

/** 相册按张管理：不按天分组，每张一行直接改 */
function MediaManager({
  items,
  tagLib,
  onDeleteTag,
  onPatched,
  onDeleteItem,
}: {
  items: AlbumPickItem[];
  tagLib: string[];
  onDeleteTag: (name: string) => void;
  onPatched: (id: string, patch: Partial<AlbumPickItem>) => void;
  onDeleteItem: (id: string) => void;
}) {
  const t = useT();
  const [zoom, setZoom] = useState<number | null>(null);
  const photos = items.filter((i) => i.kind === "photo").length;
  const videos = items.length - photos;
  return (
    <div className="space-y-2.5">
      <p className="px-1 text-sm leading-relaxed text-ink-soft">
        {t("wd.mediaDesc", { n: items.length, photos, videos })}
      </p>
      {tagLib.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-sm font-bold text-ink-soft">{t("wd.tagLib")}</span>
          {tagLib.map((tg) => (
            <span key={tg} className="flex items-center gap-1 rounded-full px-2 py-0.5 font-hand text-sm text-ink" style={{ background: tagColor(tg) }}>
              {tg}
              <button
                type="button"
                onClick={() => onDeleteTag(tg)}
                aria-label={t("wd.libDelTag", { name: tg })}
                title={t("wd.libDelTagTitle")}
                className="grid size-3.5 place-items-center rounded-full bg-ink/10 transition hover:bg-ink/25"
              >
                <X weight="bold" className="size-2" />
              </button>
            </span>
          ))}
        </div>
      )}
      {items.map((m, i) => (
        <MediaRow
          key={`${m.id}-${m.entryDate ?? ""}`}
          item={m}
          tagLib={tagLib}
          onPatched={onPatched}
          onOpen={() => setZoom(i)}
          onDelete={() => onDeleteItem(m.id)}
        />
      ))}
      {items.length === 0 && <p className="card-paper py-10 text-center text-ink-soft">{t("wd.mediaEmpty")}</p>}
      <Lightbox
        photos={items.map((m) => ({ ...m, entryDate: m.entryDate ?? "" }) as LightboxPhoto)}
        index={zoom}
        onClose={() => setZoom(null)}
        onNav={setZoom}
      />
    </div>
  );
}

function DashboardInner({
  initialEntries,
  canManage,
  settings,
  publishTypes,
  initialEggs,
  initialMilestones,
  initialScreenings,
  album,
  allTags: initialTagLib,
  initialType: initialTypeRaw,
  initialTab: initialTabRaw,
  initialFilter: initialFilterRaw,
  editId,
}: {
  initialEntries: EntryDTO[];
  /** 能不能进「本子信息」等管理区：他（作者口令）能，她（读者密码）不能 */
  canManage: boolean;
  /** 只在能进管理区时才从服务端传下来（不进读者的 RSC payload） */
  settings?: SiteSettings;
  /** 她被授予的发表类型（服务端按 settings.shePublishTypes 算好传入，只传类型名）；他不传＝不限 */
  publishTypes?: readonly string[];
  initialEggs: EggDTO[];
  initialMilestones: MilestoneDTO[];
  /** 排片（纪念视频首映）：两人都能发，列表里都能改 */
  initialScreenings: Screening[];
  album: AlbumPickItem[];
  /** 全局标签库（任何地方输入过的标签都在这儿） */
  allTags: string[];
  /** URL 参数在服务端读好传进来：?type= 直达新增模块 / ?tab= 直达标签 / ?edit= 直达编辑 */
  initialType?: string;
  initialTab?: string;
  /** ?filter= 直达「本子里的一切」某个分类 */
  initialFilter?: string;
  editId?: string;
}) {
  const toast = useToast();
  const t = useT();
  /** 她能不能动这个类型：他全都能；她看 publishTypes（自由拼贴 board 按手账页算） */
  const canPublish = (k: string) => {
    if (canManage) return true;
    const key = k === "board" ? "journal" : k;
    return !publishTypes || publishTypes.includes(key);
  };
  /** 一个类型都没批到就不给「写一页」（免得空表单不知所云），只留「本子里的一切」 */
  const canWrite = !publishTypes || publishTypes.length > 0;
  /** 新建表单的默认类型：她没批到手账页就退到第一个能发的 */
  const defaultType: FormKind = TYPE_KEYS.find((k) => canPublish(k)) ?? "journal";
  // ?type=quote 直达对应新增模块（含大事记 / 彩蛋）
  // 彩蛋只有他能建；她只到得了被授予发表的类型（越权直达退成第一个能发的）
  const initialType =
    TYPE_KEYS.includes(initialTypeRaw as FormKind) && (initialTypeRaw !== "egg" || canManage) && canPublish(initialTypeRaw as FormKind)
      ? (initialTypeRaw as FormKind)
      : undefined;
  const initialTab =
    TAB_KEYS.includes(initialTabRaw as Tab) && (initialTabRaw !== "settings" || canManage) && (initialTabRaw !== "write" || canWrite)
      ? (initialTabRaw as Tab)
      : canWrite
        ? "write"
        : "list";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [entries, setEntries] = useState<EntryDTO[]>(initialEntries);
  const [milestones, setMilestones] = useState<MilestoneDTO[]>(initialMilestones);
  const [screenings, setScreenings] = useState<Screening[]>(initialScreenings);
  const [eggs, setEggs] = useState<EggDTO[]>(initialEggs);
  const [albumItems, setAlbumItems] = useState(album);
  // 新建手账页的两种写法：文字表单 / 自由拼贴画板（只在选「手账页」时出现）
  const [pageMode, setPageMode] = useState<"form" | "board">("form");
  const [formType, setFormType] = useState<FormKind>(initialType ?? defaultType);
  // 保存过一页后让新建画板 / 大事记 / 彩蛋表单重置成空白
  const [boardSeq, setBoardSeq] = useState(0);
  const [milestoneSeq, setMilestoneSeq] = useState(0);
  const [screeningSeq, setScreeningSeq] = useState(0);
  const [eggSeq, setEggSeq] = useState(0);
  // ?edit=id 时直接进入编辑（惰性初始化，避免 effect 里 setState）；她越权的类型不给进
  const [editing, setEditing] = useState<EntryDTO | null>(() => {
    const hit = editId ? (initialEntries.find((e) => e.id === editId) ?? null) : null;
    return hit && canPublish(hit.type) ? hit : null;
  });
  const [editingMilestone, setEditingMilestone] = useState<MilestoneDTO | null>(null);
  const [editingScreening, setEditingScreening] = useState<Screening | null>(null);
  const [editingEgg, setEditingEgg] = useState<EggDTO | null>(null);
  // 本子里的一切：筛选（?filter= 服务端读好传进来；她看不到彩蛋这一栏）
  const filterAllowed = FILTERS.some((f) => f.value === initialFilterRaw) && (initialFilterRaw !== "egg" || canManage);
  const [filter, setFilter] = useState<FilterValue>((filterAllowed ? initialFilterRaw : "all") as FilterValue);
  // 批量设置公开性：勾一排历史内容一次放开/收回（照片是按张管理的，批量去「全部」里勾照片页）
  const [batch, setBatch] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  // 所在的位置（标签页 + 分类）写进地址栏：刷新/分享链接都能回到这里，不用从头点
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "write") params.set("tab", tab);
    if (tab === "list" && filter !== "all") params.set("filter", filter);
    const q = params.toString();
    try {
      window.history.replaceState(null, "", q ? `/write?${q}` : "/write");
    } catch {
      /* 极老浏览器就算了 */
    }
  }, [tab, filter]);

  /** 定向刷新：发表/改动完只拉真正变了的列表，不四连刷。
   *  各列表互不依赖——条目存完只有条目列表会变，大事记/彩蛋/排片同理 */
  const refresh = useCallback(async (...keys: ("entries" | "milestones" | "screenings" | "eggs")[]) => {
    const one = async (k: (typeof keys)[number]) => {
      const path =
        k === "entries" ? "/api/entries" : k === "milestones" ? "/api/milestones" : k === "screenings" ? "/api/screenings" : "/api/eggs";
      const data = await fetch(path)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!data) return;
      if (k === "entries") setEntries(data.entries as EntryDTO[]);
      else if (k === "milestones") setMilestones(data.milestones as MilestoneDTO[]);
      else if (k === "screenings") setScreenings(data.screenings as Screening[]);
      else setEggs(data.eggs as EggDTO[]);
    };
    await Promise.all(keys.map(one));
  }, []);

  /** 按张管理改完一张（描述/日期/标签）后同步素材列表；挪日期的顺手刷新条目列表；新标签顺手进标签库 */
  function patchAlbumItem(id: string, patch: Partial<AlbumPickItem>) {
    setAlbumItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    if (patch.tags) setTagLib((prev) => [...new Set([...prev, ...patch.tags!])].sort((a, b) => (a < b ? -1 : 1)));
    if (patch.entryDate !== undefined) void refresh("entries");
  }

  /** 按张删一张：本地列表立刻移掉，条目列表刷新（空页会被回收） */
  async function deleteAlbumItem(id: string) {
    const res = await fetch(`/api/media/${id}?force=1`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setAlbumItems((prev) => prev.filter((a) => a.id !== id));
      void refresh("entries"); // 空页会被回收，条目列表跟着动
      toast(t("wd.rowDelOk"));
    } else {
      toast(t("wd.rowDelFail"), "error");
    }
  }

  /** 全局删一个标签：库里、所有照片/页面上、本地状态里一起清掉 */
  async function deleteTagGlobally(name: string) {
    if (!window.confirm(t("wd.tagDelConfirm", { name }))) return;
    const res = await fetch(`/api/tags/${encodeURIComponent(name)}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setTagLib((prev) => prev.filter((tg) => tg !== name));
      setAlbumItems((prev) => prev.map((a) => ({ ...a, tags: (a.tags ?? []).filter((tg) => tg !== name) })));
      setEntries((prev) => prev.map((e) => ({ ...e, tags: (e.tags ?? []).filter((tg) => tg !== name) })));
      toast(t("wd.tagDelOk", { name }));
    } else {
      toast(t("wd.tagDelFail"), "error");
    }
  }

  function onSaved(entry: EntryDTO, isNew: boolean) {
    toast(isNew ? t("wd.savedPaste", { date: entry.entry_date.replaceAll("-", ".") }) : t("board.savedEdit"));
    setEditing(null);
    setBoardSeq((s) => s + 1);
    setTab("list");
    void refresh("entries");
  }

  function onMilestoneSaved() {
    setEditingMilestone(null);
    setMilestoneSeq((s) => s + 1);
    setTab("list");
    void refresh("milestones");
  }

  function onEggSaved() {
    setEditingEgg(null);
    setEggSeq((s) => s + 1);
    setTab("list");
    void refresh("eggs");
  }

  function onScreeningSaved() {
    setEditingScreening(null);
    setScreeningSeq((s) => s + 1);
    setTab("list");
    void refresh("screenings");
  }

  /** 排片的同一枚公开开关：这场首映对访客公开 / 仅她可见 */
  async function toggleScreeningVisibility(s: Screening) {
    const next = s.visibility === "public" ? "private" : "public";
    const res = await fetch(`/api/screenings/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    }).catch(() => null);
    if (res && res.ok) {
      setScreenings((prev) => prev.map((x) => (x.id === s.id ? { ...x, visibility: next } : x)));
      toast(next === "public" ? t("wd.visScrPublic") : t("wd.visScrPrivate", { reader: READER_NAME }));
    } else {
      toast(t("wd.visFail"), "error");
    }
  }

  async function onDeleteScreening(s: Screening) {
    if (!window.confirm(t("wd.delScrConfirm", { title: s.title }))) return;
    const res = await fetch(`/api/screenings/${s.id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setScreenings((prev) => prev.filter((x) => x.id !== s.id));
      if (editingScreening?.id === s.id) setEditingScreening(null);
      toast(t("wd.delScrOk"));
    } else {
      toast(t("wd.delFail"), "error");
    }
  }

  async function onDeleteEntry(entry: EntryDTO) {
    const hint = entry.title || entry.body.slice(0, 12) || t(TYPE_META[entry.type].labelKey);
    if (!window.confirm(t("wd.delEntryConfirm", { hint }))) return;
    const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      if (editing?.id === entry.id) setEditing(null);
      toast(t("wd.delEntryOk"));
    } else {
      toast(t("wd.delFail"), "error");
    }
  }

  /** 列表上的快捷开关：这一页对访客公开 / 仅她可见 */
  async function toggleEntryVisibility(entry: EntryDTO) {
    const next = entry.visibility === "public" ? "private" : "public";
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    }).catch(() => null);
    if (res && res.ok) {
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, visibility: next } : e)));
      toast(next === "public" ? t("wd.visEntryPublic") : t("wd.visEntryPrivate", { reader: READER_NAME }));
    } else {
      toast(t("wd.visFail"), "error");
    }
  }

  /** 大事记的同一枚开关 */
  async function toggleMilestoneVisibility(m: MilestoneDTO) {
    const next = m.visibility === "public" ? "private" : "public";
    const res = await fetch(`/api/milestones/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    }).catch(() => null);
    if (res && res.ok) {
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, visibility: next } : x)));
      toast(next === "public" ? t("wd.visMsPublic") : t("wd.visMsPrivate", { reader: READER_NAME }));
    } else {
      toast(t("wd.visFail"), "error");
    }
  }

  /** 这行她能不能动：改删 / 公开开关 / 批量勾选都看它（他全都能，她只到得了被授予的类型） */
  const rowPublishable = (r: Row) =>
    r.t === "entry"
      ? canPublish(r.entry.type)
      : r.t === "milestone"
        ? canPublish("milestone")
        : r.t === "screening"
          ? canPublish("screening")
          : canManage; // 彩蛋只有他能动

  /** 批量模式：勾/取消一行 */
  function togglePicked(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 一键把当前筛选下能勾的行全部勾上/清空 */
  function pickAllVisible(visible: Row[]) {
    // 批量只勾条目和大事记（排片/彩蛋不参与批量公开设置），且她只勾得到被授予的类型
    const ids = visible
      .filter((r): r is Extract<Row, { t: "entry" } | { t: "milestone" }> => (r.t === "entry" || r.t === "milestone") && rowPublishable(r))
      .map((r) => (r.t === "entry" ? r.entry.id : r.milestone.id));
    setPicked((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  /** 批量应用公开/仅她，本地状态同步更新 */
  async function applyBatch(visibility: "public" | "private") {
    if (batchBusy || picked.size === 0) return;
    setBatchBusy(true);
    const entryIds = entries.filter((e) => picked.has(e.id)).map((e) => e.id);
    const milestoneIds = milestones.filter((m) => picked.has(m.id)).map((m) => m.id);
    try {
      const res = await fetch("/api/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds, milestoneIds, visibility }),
      });
      const data = (await res.json().catch(() => ({}))) as { entries?: number; milestones?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? t("wd.batchFail"));
      setEntries((prev) => prev.map((e) => (picked.has(e.id) ? { ...e, visibility } : e)));
      setMilestones((prev) => prev.map((m) => (picked.has(m.id) ? { ...m, visibility } : m)));
      const n = (data.entries ?? 0) + (data.milestones ?? 0);
      toast(
        visibility === "public"
          ? t("wd.batchPublicOk", { n })
          : t("wd.batchPrivateOk", { n, reader: READER_NAME })
      );
      setPicked(new Set());
    } catch (e) {
      toast(e instanceof Error ? e.message : t("wd.visFail"), "error");
    } finally {
      setBatchBusy(false);
    }
  }

  async function onDeleteMilestone(m: MilestoneDTO) {
    if (!window.confirm(t("wd.delMsConfirm", { title: m.title }))) return;
    const res = await fetch(`/api/milestones/${m.id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
      if (editingMilestone?.id === m.id) setEditingMilestone(null);
      toast(t("wd.delMsOk"));
    } else {
      toast(t("wd.delFail"), "error");
    }
  }

  async function onDeleteEgg(egg: EggDTO) {
    if (!window.confirm(t("wd.delEggConfirm", { title: egg.title }))) return;
    const res = await fetch(`/api/eggs/${egg.id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setEggs((prev) => prev.filter((e) => e.id !== egg.id));
      if (editingEgg?.id === egg.id) setEditingEgg(null);
      toast(t("wd.delEggOk"));
    } else {
      toast(t("wd.delFail"), "error");
    }
  }

  async function copyEggLink(egg: EggDTO) {
    const url = `${window.location.origin}/someday/${egg.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("wd.eggLinkCopied"));
    } catch {
      toast(url);
    }
  }

  function goEditEntry(entry: EntryDTO) {
    setEditing(entry);
    setEditingMilestone(null);
    setEditingScreening(null);
    setEditingEgg(null);
    setTab("write");
    window.scrollTo({ top: 0 });
  }

  function goEditMilestone(m: MilestoneDTO) {
    setEditingMilestone(m);
    setEditing(null);
    setEditingScreening(null);
    setEditingEgg(null);
    setTab("write");
    window.scrollTo({ top: 0 });
  }

  function goEditScreening(s: Screening) {
    setEditingScreening(s);
    setEditing(null);
    setEditingMilestone(null);
    setEditingEgg(null);
    setTab("write");
    window.scrollTo({ top: 0 });
  }

  function goEditEgg(egg: EggDTO) {
    setEditingEgg(egg);
    setEditing(null);
    setEditingMilestone(null);
    setEditingScreening(null);
    setTab("write");
    window.scrollTo({ top: 0 });
  }

  // 统一列表：条目 + 大事记 + 排片 + 彩蛋，按日期倒序
  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [
      ...entries.map((e) => ({ t: "entry" as const, kind: (e.type === "board" ? "journal" : e.type) as FilterValue, date: e.entry_date, entry: e })),
      ...milestones.map((m) => ({ t: "milestone" as const, kind: "milestone" as const, date: m.date, milestone: m })),
      ...screenings.map((s) => ({ t: "screening" as const, kind: "screening" as const, date: s.premiereAt, screening: s })),
      ...eggs.map((g) => ({ t: "egg" as const, kind: "egg" as const, date: g.revealDate, egg: g })),
    ];
    return all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [entries, milestones, screenings, eggs]);
  const visibleRows = filter === "all" ? rows : rows.filter((r) => r.kind === filter);

  // 本子里用过的标签：表单里「常用」建议用（全局标签库，随输入/删除实时变）
  const [tagLib, setTagLib] = useState(initialTagLib);

  const editingSomething = editing || editingMilestone || editingScreening || editingEgg;

  return (
    <div className="mx-auto max-w-3xl py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("wd.pageTitle")}</h1>
        <Link href="/" className="link-soft text-sm">
          {t("wd.backHome")}
          <ArrowRight weight="bold" className="size-3.5" />
        </Link>
      </header>

      {/* 工作台标签 */}
      <div className="mt-7 flex gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            // 一个类型都没批到的她不给「写一页」，只留「本子里的一切」
            ...(canWrite
              ? [{ value: "write" as Tab, label: editingSomething ? t("wd.tabEdit") : t("wd.tabWrite"), icon: PencilSimple, cls: "bg-rose-soft text-rose-deep" }]
              : []),
            { value: "list" as Tab, label: t("wd.tabAll"), icon: Stack, cls: "bg-mist text-ink" },
            // 「本子信息」只有他能进（她只写内容，不改本子设置）
            ...(canManage
              ? [{ value: "settings" as Tab, label: t("wd.tabSettings"), icon: GearSix, cls: "bg-butter text-ink" }]
              : []),
          ]
        ).map(({ value, label, icon: Icon, cls }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ease-spring",
              tab === value ? cn(cls, "-translate-y-px shadow-sm") : "border border-ink/15 text-ink-soft hover:bg-ink/5"
            )}
          >
            <Icon weight="bold" className="size-4" />
            {label}
          </button>
        ))}
        {/* 她盖过的章、寄回来的话：单独一页，两人都能进 */}
        <Link
          href="/write/marks"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-rose-soft px-4 py-2 text-sm font-bold text-rose-deep transition-all duration-300 ease-spring hover:-translate-y-px"
        >
          <HeartStraight weight="fill" className="size-4" />
          {t("wd.marks")}
        </Link>
        {canManage && (
          <>
            {/* 访客记录：谁（IP/城市）什么时候来逛过 —— 隐私统计，只有他能看 */}
            <Link
              href="/write/visitors"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-mist px-4 py-2 text-sm font-bold text-ink transition-all duration-300 ease-spring hover:-translate-y-px"
            >
              <GlobeHemisphereWest weight="fill" className="size-4" />
              {t("wd.visitors")}
            </Link>
            {/* 放映室排片管理：首映的增删改与公开设置，只有他能进（她在写作台发新片） */}
            <Link
              href="/write/screenings"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-butter px-4 py-2 text-sm font-bold text-ink transition-all duration-300 ease-spring hover:-translate-y-px"
            >
              <FilmSlate weight="fill" className="size-4" />
              {t("wd.screenings")}
            </Link>
          </>
        )}
      </div>

      <div className="mt-7">
        {tab === "write" &&
          (editing ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">{t("wd.editingEntry", { date: editing.entry_date })}</p>
              {editing.type === "board" ? (
                <BoardEditor
                  key={editing.id}
                  initial={{
                    id: editing.id,
                    title: editing.title,
                    entryDate: editing.entry_date,
                    layout: (editing.layout as BoardLayout | null) ?? null,
                    mediaIds: editing.media.map((m) => m.id),
                  }}
                  onSaved={onSaved}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <EntryForm key={editing.id} initial={editing} album={albumItems} knownTags={tagLib} canManage={canManage} publishTypes={publishTypes} onTagDelete={(t) => void deleteTagGlobally(t)} onSaved={onSaved} onCancel={() => setEditing(null)} />
              )}
            </div>
          ) : editingMilestone ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">{t("wd.editingMs", { title: editingMilestone.title })}</p>
              <MilestoneForm
                initial={editingMilestone}
                album={albumItems}
                onSaved={onMilestoneSaved}
                onCancel={() => setEditingMilestone(null)}
                onAlbumGrow={(item) => setAlbumItems((prev) => [item, ...prev])}
              />
            </div>
          ) : editingScreening ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">{t("wd.editingScreen", { title: editingScreening.title })}</p>
              <ScreeningForm
                album={albumItems}
                editing={editingScreening}
                onSaved={onScreeningSaved}
                onCancel={() => setEditingScreening(null)}
              />
            </div>
          ) : editingEgg ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-soft">{t("wd.editingEgg", { title: editingEgg.title })}</p>
              <EggForm initial={editingEgg} album={albumItems} onSaved={onEggSaved} onCancel={() => setEditingEgg(null)} />
            </div>
          ) : (
            <div className="space-y-5">
              {/* 「手账页」专属：文字表单 / 自由画板 二选一；选了别的类型就收起来 */}
              {(pageMode === "board" || formType === "journal") && (
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "form", label: t("wd.modeForm"), icon: PencilSimple },
                      { value: "board", label: t("wd.modeBoard"), icon: Sticker },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPageMode(value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ease-spring",
                        pageMode === value
                          ? "-translate-y-px bg-rose-soft text-rose-deep shadow-sm"
                          : "border border-ink/15 text-ink-soft hover:bg-ink/5"
                      )}
                    >
                      <Icon weight="bold" className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {/* 文字表单（含 6 张类型卡）；两个都保持挂载、按需显隐：切来切去不丢草稿 */}
              <div className={pageMode === "board" ? "hidden" : undefined}>
                <EntryForm onSaved={onSaved} onTypeChange={setFormType} type={formType} album={albumItems} knownTags={tagLib} canManage={canManage} publishTypes={publishTypes} onTagDelete={(t) => void deleteTagGlobally(t)} />
              </div>
              {/* 大事记 / 彩蛋表单（类型卡选到它们时出现） */}
              {pageMode === "form" && formType === "milestone" && (
                <MilestoneForm
                  key={milestoneSeq}
                  album={albumItems}
                  onSaved={onMilestoneSaved}
                  onCancel={() => setFormType(defaultType)}
                  onAlbumGrow={(item) => setAlbumItems((prev) => [item, ...prev])}
                />
              )}
              {pageMode === "form" && formType === "screening" && (
                <ScreeningForm key={screeningSeq} album={albumItems} onSaved={onScreeningSaved} onCancel={() => setFormType(defaultType)} />
              )}
              {pageMode === "form" && formType === "egg" && (
                <EggForm key={eggSeq} album={albumItems} onSaved={onEggSaved} onCancel={() => setFormType(defaultType)} />
              )}
              <div className={pageMode === "board" ? undefined : "hidden"}>
                <BoardEditor key={boardSeq} onSaved={onSaved} />
              </div>
            </div>
          ))}

        {tab === "list" && (
          <div className="space-y-4">
            <p className="px-1 text-sm leading-relaxed text-ink-soft">{t("wd.listIntro")}</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {FILTERS.filter(({ value }) => value !== "egg" || canManage).map(({ value, labelKey }) => {
                const n = value === "all" ? rows.length : value === "photo" ? albumItems.length : rows.filter((r) => r.kind === value).length;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold transition-all duration-300 ease-spring",
                      filter === value ? "-translate-y-px bg-rose-soft text-rose-deep shadow-sm" : "border border-ink/15 text-ink-soft hover:bg-ink/5"
                    )}
                  >
                    {t(labelKey)}
                    <span className="font-round text-[11px] tracking-wider opacity-70">{n}</span>
                  </button>
                );
              })}
              {/* 批量设置公开性：相册筛选下按天成页来勾（平时是按张管理的媒体视图，批量时切成日期页行） */}
              {!batch && (
                <button
                  type="button"
                  onClick={() => setBatch(true)}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-ink/25 px-3.5 py-1.5 text-sm font-bold text-ink-soft transition hover:border-rose hover:text-rose-deep"
                >
                  <Checks className="size-4" weight="bold" />
                  {t("wd.batchOn")}
                </button>
              )}
            </div>

            {/* 批量操作条：全选当前筛选 → 设为公开 / 收回 */}
            {batch && (
              <div className="card-paper flex flex-wrap items-center gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => pickAllVisible(visibleRows)}
                  className="flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-sm font-bold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                >
                  {(() => {
                    const ids = visibleRows
                      .filter((r): r is Extract<Row, { t: "entry" } | { t: "milestone" }> =>
                        (r.t === "entry" || r.t === "milestone") && rowPublishable(r)
                      )
                      .map((r) => (r.t === "entry" ? r.entry.id : r.milestone.id));
                    const allOn = ids.length > 0 && ids.every((id) => picked.has(id));
                    return allOn ? <CheckCircle weight="fill" className="size-4 text-rose-deep" /> : <Circle className="size-4" />;
                  })()}
                  {t("wd.batchAll")}
                </button>
                <span className="font-round text-sm tracking-wider text-ink-soft">
                  {t("wd.batchPicked", { n: picked.size })}
                  {batchBusy ? t("wd.batchBusy") : ""}
                </span>
                <span className="ml-auto" />
                <button
                  type="button"
                  onClick={() => void applyBatch("public")}
                  disabled={picked.size === 0 || batchBusy}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  <Eye weight="bold" className="size-4" />
                  {t("wd.batchPublic")}
                </button>
                <button
                  type="button"
                  onClick={() => void applyBatch("private")}
                  disabled={picked.size === 0 || batchBusy}
                  className="btn-ghost px-4 py-2 text-sm"
                >
                  <EyeSlash weight="bold" className="size-4" />
                  {t("wd.batchPrivate", { reader: READER_NAME })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatch(false);
                    setPicked(new Set());
                  }}
                  className="grid size-8 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                  aria-label={t("wd.batchExit")}
                >
                  <X className="size-4" weight="bold" />
                </button>
              </div>
            )}

            {visibleRows.length === 0 && (filter !== "photo" || batch) && (
              <p className="card-paper py-10 text-center text-ink-soft">
                {rows.length === 0 ? t("wd.emptyBook") : t("wd.emptyFilter")}
              </p>
            )}

            {/* 相册：不按天分组，按张管理（描述/日期/标签当场改）；批量模式切到下面的日期页行 */}
            {filter === "photo" && !batch && (
              <MediaManager
                items={albumItems}
                tagLib={tagLib}
                onDeleteTag={(t) => void deleteTagGlobally(t)}
                onPatched={patchAlbumItem}
                onDeleteItem={(id) => void deleteAlbumItem(id)}
              />
            )}

            {/* 批量模式下相册按天成页勾选，给一句提示免得误会勾的是单张 */}
            {batch && filter === "photo" && (
              <p className="px-1 text-xs leading-relaxed text-ink-soft">{t("wd.photoBatchHint")}</p>
            )}

            {(filter !== "photo" || batch) && visibleRows.map((row) => {
              if (row.t === "entry") {
                const e = row.entry;
                const meta = TYPE_META[e.type] ?? TYPE_META.journal;
                const may = rowPublishable(row);
                return (
                  <div key={e.id}>
                    <div
                      className={cn(
                        "card-paper flex items-center gap-4 px-5 py-4 transition",
                        batch && may && "cursor-pointer hover:border-rose/40",
                        batch && picked.has(e.id) && "border-rose-deep/50 bg-rose-soft/20"
                      )}
                      onClick={batch && may ? () => togglePicked(e.id) : undefined}
                    >
                      {batch && may && <PickBox on={picked.has(e.id)} onClick={() => togglePicked(e.id)} label={t("wd.pickRow", { title: e.title ?? t("wd.thisPage") })} />}
                      <ListThumb entry={e} meta={meta} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">
                          {e.title || e.body.replace(/\*\*/g, "").slice(0, 20) || t("wd.entryMeta", { label: t(meta.labelKey), n: e.media.length })}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-round text-xs tracking-wider text-ink-soft">
                          <span>
                            {e.entry_date.replaceAll("-", ".")} · {t(meta.labelKey)}
                            {e.media.length > 0 && t("wd.entryMedia", { n: e.media.length })}
                          </span>
                          {may && (
                            <button
                              type="button"
                              onClick={() => void toggleEntryVisibility(e)}
                              title={e.visibility === "public" ? t("wd.visTitlePublic") : t("wd.visTitlePrivate", { reader: READER_NAME })}
                              className={cn(
                                "rounded-full px-2 py-0.5 font-bold transition",
                                e.visibility === "public" ? "bg-matcha/50 text-ink" : "bg-ink/8 text-ink-soft"
                              )}
                            >
                              {e.visibility === "public" ? t("wd.visPublic") : t("wd.visPrivate", { reader: READER_NAME })}
                            </button>
                          )}
                          {isScheduled(e) && (
                            <span className="rounded-full bg-butter px-2 py-0.5 font-bold text-ink">
                              {t("wd.scheduled", { date: e.reveal_at!.replaceAll("-", ".") })}
                            </span>
                          )}
                          {(e.tags ?? []).map((tg) => (
                            <span key={tg} className="rounded-full px-1.5 py-0.5 font-hand text-xs text-ink" style={{ background: tagColor(tg) }}>
                              {tg}
                            </span>
                          ))}
                        </p>
                        {e.created_at && (
                          <p className="mt-1 font-round text-[10px] tracking-wider text-ink-soft/60">
                            {t("wd.created", { time: fmtCST(e.created_at) })}
                            {e.updated_at && e.updated_at !== e.created_at && t("wd.updated", { time: fmtCST(e.updated_at) })}
                          </p>
                        )}
                      </div>
                      {!batch && may && (
                        <button
                          type="button"
                          onClick={() => goEditEntry(e)}
                          aria-label={t("action.edit")}
                          className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                        >
                          <PencilSimple className="size-4" />
                        </button>
                      )}
                      {!batch && may && (
                        <button
                          type="button"
                          onClick={() => void onDeleteEntry(e)}
                          aria-label={t("action.delete")}
                          className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
                        >
                          <TrashSimple className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              if (row.t === "milestone") {
                const m = row.milestone;
                const may = rowPublishable(row);
                return (
                  <div key={m.id}>
                    <div
                      className={cn(
                        "card-paper flex items-center gap-4 px-5 py-4 transition",
                        batch && may && "cursor-pointer hover:border-rose/40",
                        batch && picked.has(m.id) && "border-rose-deep/50 bg-rose-soft/20"
                      )}
                      onClick={batch && may ? () => togglePicked(m.id) : undefined}
                    >
                      {batch && may && <PickBox on={picked.has(m.id)} onClick={() => togglePicked(m.id)} label={t("wd.pickRow", { title: m.title })} />}
                      <span
                        className={cn(
                          "grid size-11 shrink-0 place-items-center rounded-xl bg-butter text-ink",
                          !(m.icon && STICKER_NAMES.includes(m.icon as StickerName)) && "text-ink"
                        )}
                      >
                        {m.icon && STICKER_NAMES.includes(m.icon as StickerName) ? (
                          <StickerBadge name={m.icon as StickerName} className="size-5" />
                        ) : (
                          <FlagBanner weight="fill" className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{m.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-round text-xs tracking-wider text-ink-soft">
                          <span>
                            {m.date.replaceAll("-", ".")}{t("wd.msKind")}
                            {m.mediaIds.length > 0 && t("wd.msMedia", { n: m.mediaIds.length })}
                          </span>
                          {may && (
                            <button
                              type="button"
                              onClick={() => void toggleMilestoneVisibility(m)}
                              title={m.visibility === "public" ? t("wd.visTitlePublic") : t("wd.visTitlePrivate", { reader: READER_NAME })}
                              className={cn(
                                "rounded-full px-2 py-0.5 font-bold transition",
                                m.visibility === "public" ? "bg-matcha/50 text-ink" : "bg-ink/8 text-ink-soft"
                              )}
                            >
                              {m.visibility === "public" ? t("wd.visPublic") : t("wd.visPrivate", { reader: READER_NAME })}
                            </button>
                          )}
                        </p>
                        {m.createdAt && (
                          <p className="mt-1 font-round text-[10px] tracking-wider text-ink-soft/60">
                            {t("wd.created", { time: fmtCST(m.createdAt) })}
                            {m.updatedAt && m.updatedAt !== m.createdAt && t("wd.updated", { time: fmtCST(m.updatedAt) })}
                          </p>
                        )}
                      </div>
                      {!batch && may && (
                        <button
                          type="button"
                          onClick={() => goEditMilestone(m)}
                          aria-label={t("action.edit")}
                          className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                        >
                          <PencilSimple className="size-4" />
                        </button>
                      )}
                      {!batch && may && (
                        <button
                          type="button"
                          onClick={() => void onDeleteMilestone(m)}
                          aria-label={t("action.delete")}
                          className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
                        >
                          <TrashSimple className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              if (row.t === "screening") {
                const s = row.screening;
                const may = rowPublishable(row);
                return (
                  <div key={s.id}>
                    <div className="card-paper flex items-center gap-4 px-5 py-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mist text-ink">
                        <FilmSlate weight="fill" className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{s.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-round text-xs tracking-wider text-ink-soft">
                          <span>
                            {s.premiereAt.replaceAll("-", ".")}{s.subtitle ? ` · ${s.subtitle}` : ""}
                          </span>
                          {may && (
                            <button
                              type="button"
                              onClick={() => void toggleScreeningVisibility(s)}
                              title={s.visibility === "public" ? t("wd.visTitlePublic") : t("wd.visTitlePrivate", { reader: READER_NAME })}
                              className={cn(
                                "rounded-full px-2 py-0.5 font-bold transition",
                                s.visibility === "public" ? "bg-matcha/50 text-ink" : "bg-ink/8 text-ink-soft"
                              )}
                            >
                              {s.visibility === "public" ? t("wd.visPublic") : t("wd.visPrivate", { reader: READER_NAME })}
                            </button>
                          )}
                        </p>
                        {s.createdAt && (
                          <p className="mt-1 font-round text-[10px] tracking-wider text-ink-soft/60">
                            {t("wd.created", { time: fmtCST(s.createdAt) })}
                            {s.updatedAt && s.updatedAt !== s.createdAt && t("wd.updated", { time: fmtCST(s.updatedAt) })}
                          </p>
                        )}
                      </div>
                      {may && (
                        <button
                          type="button"
                          onClick={() => goEditScreening(s)}
                          aria-label={t("action.edit")}
                          className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                        >
                          <PencilSimple className="size-4" />
                        </button>
                      )}
                      {may && (
                        <button
                          type="button"
                          onClick={() => void onDeleteScreening(s)}
                          aria-label={t("action.delete")}
                          className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
                        >
                          <TrashSimple className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              const g = row.egg;
              const doodleCount = Object.values(g.doodles ?? {}).reduce((a, b) => a + b, 0);
              return (
                <div key={g.id}>
                  <div className="card-paper flex items-center gap-4 px-5 py-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-soft text-rose-deep">
                      <Gift weight="fill" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{g.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-round text-xs tracking-wider text-ink-soft">
                        <span>
                          {g.revealDate.replaceAll("-", ".")}{t("wd.eggMeta", { n: g.photoIds.length })}
                          {doodleCount > 0 && t("wd.eggDoodles", { n: doodleCount })}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-bold",
                            isEggArrived(g) ? "bg-matcha/50 text-ink" : "bg-butter/60 text-ink"
                          )}
                        >
                          {isEggArrived(g) ? t("wd.eggReady") : t("wd.eggSealed")}
                        </span>
                      </p>
                    </div>
                    <a
                      href={`/someday/${g.id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("wd.eggOpen")}
                      title={t("wd.eggOpenTitle")}
                      className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                    >
                      <Eye className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyEggLink(g)}
                      aria-label={t("wd.eggCopy")}
                      title={t("wd.eggCopy")}
                      className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                    >
                      <Copy className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goEditEgg(g)}
                      aria-label={t("action.edit")}
                      className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                    >
                      <PencilSimple className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteEgg(g)}
                      aria-label={t("action.delete")}
                      className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
                    >
                      <TrashSimple className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "settings" && canManage && settings && <SettingsForm initial={settings} />}
      </div>
    </div>
  );
}

export function WriteDashboard(props: {
  initialEntries: EntryDTO[];
  /** 能不能进「本子信息」等管理区：他（作者口令）能，她（读者密码）不能 */
  canManage: boolean;
  /** 只在能进管理区时才传（不进读者的 RSC payload） */
  settings?: SiteSettings;
  /** 她被授予的发表类型（只传类型名）；他不传＝不限 */
  publishTypes?: readonly string[];
  initialEggs: EggDTO[];
  initialMilestones: MilestoneDTO[];
  /** 排片（纪念视频首映）：两人都能发，列表里都能改 */
  initialScreenings: Screening[];
  album: AlbumPickItem[];
  /** 全局标签库 */
  allTags: string[];
  /** URL 参数由服务端页面读好传入（?type / ?tab / ?edit） */
  initialType?: string;
  initialTab?: string;
  /** ?filter= 直达「本子里的一切」某个分类 */
  initialFilter?: string;
  editId?: string;
}) {
  return <DashboardInner {...props} />;
}

/* hmr-probe */
