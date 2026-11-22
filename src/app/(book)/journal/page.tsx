import type { Metadata } from "next";
import Link from "next/link";
import { isAuthor, isReader } from "@/lib/auth";
import { listEntries } from "@/lib/entries";
import { seenMap } from "@/lib/marks";
import { getSettings, sectionOpen } from "@/lib/settings";
import { JournalBook } from "@/components/journal/JournalBook";
import { DoodleDivider } from "@/components/journal/DoodleDivider";
import { Sticker } from "@/components/journal/Sticker";
import { AddEntryButton } from "@/components/AddEntryButton";
import { GuestLock } from "@/components/GuestLock";
import { recordGuestVisitFor } from "@/lib/visitors";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tWith(await getLocale(), "journal.title") };
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await recordGuestVisitFor("/journal");
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const [reader, author, settings, sp] = [
    await isReader(),
    await isAuthor(),
    getSettings(),
    await searchParams,
  ];
  // 整栏没对访客公开：只给一扇门
  if (!reader && !sectionOpen(settings, "journal")) return <GuestLock section={t("nav.tab.journal")} />;

  // 手账本只放手账页和自由拼贴页；照片在拍立得墙、语录在语录墙、信在信箱。
  // 访客只看标了「公开」的那几页
  const entries = listEntries({ excludeTypes: ["photo", "quote", "letter"], guest: !reader });
  // ?date=YYYY-MM-DD：从首页「回到那几天」直达某一天
  const rawDate = typeof sp.date === "string" ? sp.date : "";
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : undefined;

  return (
    <div className="py-10">
      <header className="text-center">
        <h1 className="text-4xl font-bold">{t("journal.title")}</h1>
        <p className="mt-3 text-ink-soft">{t("journal.subtitle")}</p>
        <DoodleDivider variant="wave" className="mx-auto mt-6" />
        {author && (
          <div className="mt-6">
            <AddEntryButton href="/write?type=journal" icon="notebook" label={t("journal.add")} />
          </div>
        )}
      </header>

      {entries.length === 0 ? (
        <div className="card-paper mx-auto mt-16 flex max-w-md flex-col items-center gap-4 py-14 text-center">
          <Sticker name="cloud" className="size-12 text-mist" />
          <p className="text-ink-soft">
            {reader ? t("journal.emptyReader") : t("home.emptyGuest")}
          </p>
          {author && (
            <Link href="/write?type=journal" className="btn-primary">
              {t("journal.writeFirst")}
            </Link>
          )}
        </div>
      ) : (
        <JournalBook
          entries={entries}
          author={author}
          reader={reader}
          initialDate={initialDate}
          seens={Object.fromEntries(seenMap(entries.map((e) => e.id)))}
        />
      )}
    </div>
  );
}
