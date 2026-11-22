"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Translate } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useLocale } from "@/i18n/LocaleProvider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
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
        aria-label={t("locale.label")}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 text-sm font-bold text-ink-soft transition hover:bg-ink/5 hover:text-ink"
      >
        <Translate size={20} weight="duotone" />
        <span aria-hidden>{LOCALE_LABELS[locale]}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-28 rounded-2xl border border-ink/10 bg-card p-1.5 shadow-lifted"
          >
            {LOCALES.map((l: Locale) => (
              <li key={l} role="option" aria-selected={locale === l}>
                <button
                  type="button"
                  onClick={() => {
                    setLocale(l);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition",
                    locale === l
                      ? "bg-rose-soft text-rose-deep"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                  )}
                >
                  {LOCALE_LABELS[l]}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
