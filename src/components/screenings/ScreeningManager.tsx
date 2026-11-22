"use client";

import { useRef, useState } from "react";
import { Check, Eye, EyeSlash, FilmSlate, ImageSquare, PencilSimple, SpinnerGap, TrashSimple, UploadSimple, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/Toast";
import { uploadFile, type MediaDTO } from "@/lib/client-upload";
import { AlbumPickThumb } from "@/components/write/AlbumPickThumb";
import type { AlbumPickItem } from "@/components/write/MilestoneManager";
import type { Screening } from "@/lib/screenings";
import { READER_NAME } from "@/lib/reader";
import { useT } from "@/i18n/LocaleProvider";

function fmtDur(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** 「从本子里选」浮层：相册里已有的照片/视频挑一个直接用（原处不动） */
function AlbumPicker({
  items,
  onPick,
  onClose,
}: {
  items: AlbumPickItem[];
  onPick: (item: AlbumPickItem) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card-paper max-h-[75vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("screening.pick")}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("action.close")}
            className="grid size-8 place-items-center rounded-full text-ink-soft transition hover:bg-ink/10 hover:text-ink"
          >
            <X weight="bold" className="size-4" />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">{t("screening.pickEmpty")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.slice(0, 40).map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onPick(it)}
                className="group overflow-hidden rounded-xl border border-ink/10 transition hover:-translate-y-0.5 hover:border-rose"
                title={`${it.entryDate ?? ""} ${it.caption ?? ""}`.trim()}
              >
                <AlbumPickThumb item={it} />
                <p className="truncate px-1.5 py-1 font-round text-[10px] tracking-wider text-ink-soft group-hover:text-ink">
                  {it.caption?.slice(0, 10) || it.entryDate?.replaceAll("-", ".") || ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 排片表单：完整视频（新上传或从本子里选）+ 片名 + 寄语 + 首映日期 + 可选封面 */
export function ScreeningForm({
  album,
  editing,
  onSaved,
  onCancel,
}: {
  album: AlbumPickItem[];
  editing?: Screening;
  onSaved: (s: Screening, isNew: boolean) => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const t = useT();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [subtitle, setSubtitle] = useState(editing?.subtitle ?? "");
  const [premiereAt, setPremiereAt] = useState(editing?.premiereAt ?? todayStr());
  const [isPublic, setIsPublic] = useState(editing?.visibility === "public");
  const [video, setVideo] = useState<MediaDTO | null>(null);
  const [videoFromAlbum, setVideoFromAlbum] = useState(false);
  const [videoName, setVideoName] = useState("");
  const [videoPct, setVideoPct] = useState(0);
  const [cover, setCover] = useState<MediaDTO | null>(null);
  const [coverFromAlbum, setCoverFromAlbum] = useState(false);
  const [picker, setPicker] = useState<null | "video" | "cover">(null);
  const [busy, setBusy] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  /** 从本子里选：直接引用已有媒体（原处不动，不复制文件） */
  function pickFromAlbum(item: AlbumPickItem, as: "video" | "cover") {
    const dto: MediaDTO = {
      id: item.id,
      url: item.url,
      thumbUrl: item.thumbUrl ?? null,
      posterUrl: item.posterUrl ?? null,
      kind: item.kind,
      mime: item.mime ?? "",
      width: item.width ?? null,
      height: item.height ?? null,
      caption: item.caption ?? null,
      liveVideo: item.liveVideo ?? null,
    };
    if (as === "video") {
      setVideo(dto);
      setVideoFromAlbum(true);
      setVideoName(item.caption || item.entryDate || t("screening.albumVideo"));
      if (!title.trim()) setTitle((item.caption || item.entryDate || t("screening.defaultTitle")).slice(0, 30));
    } else {
      setCover(dto);
      setCoverFromAlbum(true);
    }
    setPicker(null);
  }

  /** 移除已选：自己上传的孤儿连文件一起撤掉，本子里选来的只取消选择 */
  function dropPicked(setter: typeof setVideo, fromAlbum: boolean) {
    return (m: MediaDTO | null) => {
      if (m && !fromAlbum) {
        void fetch(`/api/media/${m.id}`, { method: "DELETE", keepalive: true }).catch(() => undefined);
      }
      setter(null);
    };
  }

  async function pickVideo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast(t("screening.videoKind"), "error");
      return;
    }
    setVideoName(file.name);
    setVideoPct(0);
    setVideoFromAlbum(false);
    try {
      const dto = await uploadFile(file, { onProgress: (loaded) => setVideoPct(Math.round((loaded / file.size) * 100)) });
      setVideo(dto);
      if (!title.trim()) setTitle(file.name.replace(/\.\w+$/, "").slice(0, 30));
      toast(t("screening.videoOk"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("screening.videoFail"), "error");
      setVideoName("");
    }
  }

  async function pickCover(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("screening.coverKind"), "error");
      return;
    }
    setCoverFromAlbum(false);
    try {
      const dto = await uploadFile(file);
      setCover(dto);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("screening.coverFail"), "error");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const mediaId = editing ? video?.id ?? editing.video.id : video?.id;
    if (!title.trim() || !mediaId || !premiereAt) {
      toast(t("screening.needFields"), "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/screenings/${editing.id}` : "/api/screenings", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subtitle,
          premiereAt,
          mediaId,
          coverMediaId: cover?.id ?? null,
          visibility: isPublic ? "public" : "private",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { screening?: Screening; error?: string };
      if (!res.ok || !data.screening) throw new Error(data.error ?? t("screening.saveFail"));
      toast(editing ? t("screening.savedEdit") : t("screening.savedNew"));
      onSaved(data.screening, !editing);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("screening.saveRetry"), "error");
    } finally {
      setBusy(false);
    }
  }

  const fieldCls = "w-full rounded-2xl border-2 border-ink/10 bg-paper px-4 py-2.5 outline-none placeholder:text-ink-soft/50 focus:border-rose";
  const labelCls = "mb-1.5 block text-sm font-bold text-ink-soft";

  return (
    <form onSubmit={submit} className="card-paper space-y-5">
      <h2 className="text-xl font-bold">{editing ? t("screening.editTitle", { title: editing.title }) : t("screening.newTitle")}</h2>

      {/* 完整视频：新上传（不进相册）或从本子里选一个已有的 */}
      <div>
        <label className={labelCls}>{t("screening.videoLabel")}</label>
        {editing && !video && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-mist/50 px-3 py-1 text-sm font-bold text-ink">
            <FilmSlate weight="fill" className="size-4" />
            {t("screening.hasVideo", { dur: fmtDur(editing.video.duration) && ` · ${fmtDur(editing.video.duration)}` })}
          </p>
        )}
        {video ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-ink", videoFromAlbum ? "bg-butter/70" : "bg-matcha/50")}>
              <Check weight="bold" className="size-4" />
              {videoFromAlbum ? t("screening.fromAlbumVideo") : t("screening.videoUploaded")}
              {videoFromAlbum ? `（${videoName.slice(0, 14)}）` : videoPct > 0 && videoPct < 100 ? `（${videoPct}%）` : ""}
            </span>
            <button
              type="button"
              onClick={() => dropPicked(setVideo, videoFromAlbum)(video)}
              className="grid size-7 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
              aria-label={t("screening.dropVideo")}
            >
              <X weight="bold" className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-deep px-3.5 py-1.5 text-sm font-bold text-paper shadow-sm transition hover:-translate-y-0.5"
            >
              <UploadSimple weight="bold" className="size-4" />
              {t("screening.uploadVideo")}
            </button>
            <button
              type="button"
              onClick={() => setPicker("video")}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-sm font-bold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
            >
              <FilmSlate weight="bold" className="size-4" />
              {t("screening.pick")}
            </button>
            {videoName && (
              <span className="inline-flex items-center gap-1.5 font-round text-sm tracking-wider text-ink-soft">
                <SpinnerGap className="size-4 animate-spin" />
                {videoName} · {videoPct}%
              </span>
            )}
          </div>
        )}
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            void pickVideo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="mt-2 font-round text-[11px] tracking-wider text-ink-soft/60">{t("screening.videoNote")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="sc-title">{t("screening.titleField")}</label>
          <input id="sc-title" value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} placeholder={t("screening.titlePh")} maxLength={60} />
        </div>
        <div>
          <label className={labelCls} htmlFor="sc-date">{t("screening.dateField")}</label>
          <input id="sc-date" type="date" value={premiereAt} onChange={(e) => setPremiereAt(e.target.value)} className={fieldCls} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="sc-sub">{t("screening.subtitleField")}</label>
        <input id="sc-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={fieldCls} placeholder={t("screening.subtitlePh")} maxLength={120} />
      </div>

      {/* 封面：可选；从本子里选或直接上传，都不选就用视频里的画面 */}
      <div>
        <label className={labelCls}>{t("screening.coverField")}</label>
        <div className="flex flex-wrap items-center gap-2.5">
          {cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- 走带鉴权的 /api/media */}
              <img src={cover.thumbUrl ?? cover.url} alt="" className="size-16 rounded-lg border border-ink/10 object-cover" />
              {coverFromAlbum && <span className="rounded-full bg-butter/70 px-2 py-0.5 text-xs font-bold text-ink">{t("screening.fromAlbum")}</span>}
              <button
                type="button"
                onClick={() => dropPicked(setCover, coverFromAlbum)(cover)}
                className="grid size-7 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
                aria-label={t("screening.dropCover")}
              >
                <X weight="bold" className="size-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-sm font-bold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                <ImageSquare weight="bold" className="size-4" />
                {t("screening.uploadCover")}
              </button>
              <button
                type="button"
                onClick={() => setPicker("cover")}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-sm font-bold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                <ImageSquare weight="bold" className="size-4" />
                {t("screening.pick")}
              </button>
            </>
          )}
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pickCover(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsPublic((v) => !v)}
        aria-pressed={isPublic}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border-2 border-ink/10 bg-paper px-4 py-3 text-left transition hover:border-ink/25"
      >
        <span>
          <span className="block text-sm font-bold">{isPublic ? t("screening.publicVis") : t("screening.readerVis", { reader: READER_NAME })}</span>
          <span className="mt-0.5 block text-xs text-ink-soft">{isPublic ? t("screening.publicHint") : t("screening.readerHint", { reader: READER_NAME })}</span>
        </span>
        <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", isPublic ? "bg-rose-deep" : "bg-ink/20")} aria-hidden>
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-paper shadow transition-all", isPublic ? "left-[22px]" : "left-0.5")} />
        </span>
      </button>

      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t("action.saving") : editing ? t("screening.saveChanges") : t("screening.schedule")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            {t("board.cancel")}
          </button>
        )}
      </div>

      {picker && (
        <AlbumPicker
          items={album.filter((i) => i.kind === (picker === "video" ? "video" : "photo"))}
          onPick={(it) => pickFromAlbum(it, picker === "video" ? "video" : "cover")}
          onClose={() => setPicker(null)}
        />
      )}
    </form>
  );
}

/** 排片列表：改/删/可见性快捷切换 */
export function ScreeningManager({ initial, album }: { initial: Screening[]; album: AlbumPickItem[] }) {
  const toast = useToast();
  const t = useT();
  const [list, setList] = useState<Screening[]>(initial);
  const [editing, setEditing] = useState<Screening | null>(null);
  const [seq, setSeq] = useState(0);

  async function toggleVis(s: Screening) {
    const next = s.visibility === "public" ? "private" : "public";
    const res = await fetch(`/api/screenings/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    }).catch(() => null);
    if (res && res.ok) {
      setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, visibility: next } : x)));
      toast(next === "public" ? t("screening.visPublicOn") : t("screening.visReaderOff", { reader: READER_NAME }));
    } else {
      toast(t("screening.visFail"), "error");
    }
  }

  async function remove(s: Screening) {
    if (!window.confirm(t("screening.removeConfirm", { title: s.title }))) return;
    const res = await fetch(`/api/screenings/${s.id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) {
      setList((prev) => prev.filter((x) => x.id !== s.id));
      toast(t("screening.removed"));
    } else {
      toast(t("screening.removeFail"), "error");
    }
  }

  return (
    <div className="space-y-6">
      {editing ? (
        <ScreeningForm
          key={editing.id}
          album={album}
          editing={editing}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <ScreeningForm
          key={seq}
          album={album}
          onSaved={() => {
            setSeq((n) => n + 1);
            void refresh();
          }}
        />
      )}

      {list.length > 0 && (
        <ul className="space-y-2.5">
          {list.map((s) => {
            const premiered = s.premiereAt <= todayStr();
            return (
              <li key={s.id} className="card-paper flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-butter text-ink">
                  <FilmSlate weight="fill" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{s.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-round text-xs tracking-wider text-ink-soft">
                    <span>
                      {t("screening.premiereAt", { date: s.premiereAt.replaceAll("-", ".") })}
                      {fmtDur(s.video.duration) && ` · ${fmtDur(s.video.duration)}`}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 font-bold", premiered ? "bg-matcha/50 text-ink" : "bg-butter/60 text-ink")}>
                      {premiered ? t("screening.premiered") : t("screening.unpremiered")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleVis(s)}
                      className={cn(
                        "rounded-full px-2 py-0.5 font-bold transition",
                        s.visibility === "public" ? "bg-matcha/50 text-ink" : "bg-ink/8 text-ink-soft"
                      )}
                    >
                      {s.visibility === "public" ? t("screening.publicVis") : t("screening.readerVis", { reader: READER_NAME })}
                    </button>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(s)}
                  aria-label={t("action.edit")}
                  className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                >
                  <PencilSimple className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(s)}
                  aria-label={t("screening.remove")}
                  className="grid size-9 place-items-center rounded-full text-ink-soft transition hover:bg-rose-soft hover:text-rose-deep"
                >
                  <TrashSimple className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  async function refresh() {
    const res = await fetch("/api/screenings").catch(() => null);
    if (!res || !res.ok) return;
    const data = (await res.json()) as { screenings: Screening[] };
    setList(data.screenings);
  }
}
