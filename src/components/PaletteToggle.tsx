"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Palette } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/LocaleProvider";

export const PALETTE_KEY = "journal-palette";

/** 四套配色（rose 为默认基础主题，不写 data-palette 属性） */
const PALETTES = [
  { id: "rose", nameKey: "nav.palette.rose", swatch: ["#fff9f0", "#e48ba8", "#b4506b"] },
  { id: "sakura", nameKey: "nav.palette.sakura", swatch: ["#fff7f9", "#ef9bb5", "#cf6b8a"] },
  { id: "lavender", nameKey: "nav.palette.lavender", swatch: ["#f9f7ff", "#a99ae8", "#6f5fbf"] },
  { id: "peach", nameKey: "nav.palette.peach", swatch: ["#fff8f2", "#f4a583", "#d97a56"] },
] as const;

type PaletteId = (typeof PALETTES)[number]["id"];

function applyPalette(id: PaletteId) {
  const root = document.documentElement;
  if (id === "rose") root.removeAttribute("data-palette");
  else root.setAttribute("data-palette", id);
  try {
    localStorage.setItem(PALETTE_KEY, id);
  } catch {}
}

/** 订阅 <html> 上的 data-palette 变化（首帧由 layout 内联脚本定好） */
function subscribePalette(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette"] });
  return () => observer.disconnect();
}

function readPalette(): PaletteId {
  const v = document.documentElement.getAttribute("data-palette");
  return v && PALETTES.some((p) => p.id === v) ? (v as PaletteId) : "rose";
}

export function PaletteToggle({ className }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const current = useSyncExternalStore(subscribePalette, readPalette, () => "rose" as PaletteId);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.palette.label")}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
      >
        <Palette size={22} weight="duotone" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-ink/10 bg-card p-2 shadow-lifted"
          >
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  applyPalette(p.id);
                  setOpen(false);
                }}
                aria-pressed={current === p.id}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-bold transition",
                  current === p.id ? "bg-rose-soft text-rose-deep" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-ink/15"
                >
                  <span className="h-full w-1/2" style={{ background: p.swatch[0] }} />
                  <span className="h-full w-1/4" style={{ background: p.swatch[1] }} />
                  <span className="h-full w-1/4" style={{ background: p.swatch[2] }} />
                </span>
                {t(p.nameKey)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
