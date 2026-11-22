"use client";

import Link from "next/link";
import { Lock } from "@phosphor-icons/react/dist/ssr";
import { Sticker } from "@/components/journal/Sticker";
import { DoodleDivider } from "@/components/journal/DoodleDivider";
import { READER_NAME } from "@/lib/reader";
import { useT } from "@/i18n/LocaleProvider";

/** 栏目上了锁：这一栏只有她（输密码）能看，访客看到的是一扇合着的门 */
export function GuestLock({ section }: { section: string }) {
  const t = useT();
  return (
    <div className="card-paper mx-auto mt-16 flex max-w-md flex-col items-center gap-5 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-rose-soft text-rose-deep">
        <Lock weight="fill" className="size-6" />
      </span>
      <div>
        <h1 className="text-2xl font-bold">{t("lock.guest.title", { section, reader: READER_NAME })}</h1>
        <p className="mt-3 text-ink-soft">{t("lock.guest.sub")}</p>
      </div>
      <DoodleDivider variant="hearts" className="w-28" />
      <Link href="/lock" className="btn-primary">
        <Lock weight="bold" className="size-4" />
        {t("lock.guest.cta")}
      </Link>
      <Sticker name="cloud" className="size-8 text-mist" />
    </div>
  );
}
