"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DoodleDivider } from "./journal/DoodleDivider";
import { LockButton } from "./LockButton";
import { useT } from "@/i18n/LocaleProvider";

/** 页脚：她本人能「合上本子」退出登录；访客的入口在导航栏右上的小锁，这里不重复放。
 *  藏了一扇隐蔽的门：2.5 秒内连点 5 下底部那行手写标语，会露出通向 /desk 的入口 */
export function SiteFooter({ reader = false }: { reader?: boolean }) {
  const t = useT();
  const taps = useRef<number[]>([]);
  const [found, setFound] = useState(false);

  function onTaglineTap() {
    if (found) return;
    const now = Date.now();
    taps.current = taps.current.filter((x) => now - x < 2500);
    taps.current.push(now);
    if (taps.current.length < 5) return;
    taps.current = [];
    setFound(true);
  }

  return (
    <footer className="mt-20 pb-10">
      <DoodleDivider variant="hearts" className="mx-auto mb-8 w-40" />
      <div className="flex flex-col items-center gap-3">
        {reader && <LockButton />}
        <button
          type="button"
          onClick={onTaglineTap}
          className="font-script text-2xl text-ink-soft/70 transition-colors hover:text-ink-soft"
        >
          written with love, kept with care
        </button>
        {found && (
          <Link
            href="/desk"
            className="text-sm text-ink-soft/70 underline decoration-dotted underline-offset-4 transition hover:text-rose-deep"
          >
            {t("desk.psst")}
          </Link>
        )}
      </div>
    </footer>
  );
}
