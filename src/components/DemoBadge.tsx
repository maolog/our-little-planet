"use client";

import { useState } from "react";
import { Plant } from "@phosphor-icons/react";
import { useT } from "@/i18n/LocaleProvider";

/** 演示站角标：公开 demo 部署时由根布局渲染（NEXT_PUBLIC_DEMO_MODE=1）。
 *  收起时只是左下角一颗小胶囊，点开告诉你：内容是样例、会定时重置、
 *  解锁密码和作者口令是多少——不然访客进不了门 */
export function DemoBadge({
  resetMinutes,
  readerPassword,
  authorPassword,
}: {
  resetMinutes: number;
  readerPassword: string;
  authorPassword: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div className="fixed bottom-3 left-3 z-50 max-w-[calc(100vw-1.5rem)]">
      {open && (
        <div className="card-paper mb-2 w-72 px-4 py-4 text-sm leading-relaxed shadow-lg">
          <p className="font-bold">{t("demo.title")}</p>
          <p className="mt-2 text-ink-soft">{t("demo.body1", { n: resetMinutes })}</p>
          <p className="mt-2 text-ink-soft">{t("demo.body2")}</p>
          <dl className="mt-3 space-y-1.5 rounded-xl bg-butter/40 px-3 py-2.5">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-soft">{t("demo.pwReader")}</dt>
              <dd className="font-script text-base font-bold tracking-widest">{readerPassword}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-soft">{t("demo.pwAuthor")}</dt>
              <dd className="font-script text-base font-bold tracking-widest">{authorPassword}</dd>
            </div>
          </dl>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper/90 px-3.5 py-2 text-xs font-bold text-ink-soft shadow backdrop-blur transition hover:text-ink"
      >
        <Plant weight="fill" className="size-3.5 text-matcha" />
        {open ? t("demo.pillOpen") : t("demo.pillClosed")}
      </button>
    </div>
  );
}
