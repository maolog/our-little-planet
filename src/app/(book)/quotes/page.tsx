import type { Metadata } from "next";
import Link from "next/link";
import { isAuthor, isReader } from "@/lib/auth";
import { listEntries } from "@/lib/entries";
import { getSettings, sectionOpen } from "@/lib/settings";
import { pickOf, tiltOf, NOTE_TONES } from "@/lib/tilt";
import { StickyNote } from "@/components/journal/StickyNote";
import { VoiceNote } from "@/components/journal/VoiceNote";
import { DoodleDivider } from "@/components/journal/DoodleDivider";
import { Sticker } from "@/components/journal/Sticker";
import { AddEntryButton } from "@/components/AddEntryButton";
import { GuestLock } from "@/components/GuestLock";
import { Reveal } from "@/components/Reveal";
import { cn } from "@/lib/cn";
import { recordGuestVisitFor } from "@/lib/visitors";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tWith(await getLocale(), "meta.quotes") };
}

export default async function QuotesPage() {
  await recordGuestVisitFor("/quotes");
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const [reader, author, settings] = [await isReader(), await isAuthor(), getSettings()];
  if (!reader && !sectionOpen(settings, "quotes")) return <GuestLock section={t("nav.tab.quotes")} />;
  // 访客只看标了「公开」的便利贴
  const quotes = listEntries({ type: "quote", guest: !reader });
  const hideDate = settings.quotesHideDate === "1";

  return (
    <div className="py-10">
      <header className="text-center">
        <h1 className="text-4xl font-bold">{t("meta.quotes")}</h1>
        <p className="mt-3 text-ink-soft">{t("quote.subtitle")}</p>
        <DoodleDivider variant="hearts" className="mx-auto mt-6 w-28" />
        {author && (
          <div className="mt-6">
            <AddEntryButton href="/write?type=quote" icon="quote" label={t("quote.add")} />
          </div>
        )}
      </header>

      {quotes.length === 0 ? (
        <div className="card-paper mx-auto mt-16 flex max-w-md flex-col items-center gap-4 py-14 text-center">
          <Sticker name="heart" className="size-12 text-rose/80" />
          <p className="text-ink-soft">{reader ? t("quote.emptyReader") : t("quote.emptyGuest")}</p>
          {author && (
            <Link href="/write?type=quote" className="btn-primary">
              {t("quote.first")}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-14 columns-1 gap-8 sm:columns-2 lg:columns-3 [&>*]:mb-8">
          {quotes.map((q) => {
            const audio = q.media.find((m) => m.kind === "audio");
            return (
              <div key={q.id} className="break-inside-avoid px-2 sm:px-0">
                <Reveal>
                  <StickyNote
                    text={q.body || undefined}
                    speaker={q.speaker}
                    date={hideDate ? null : q.entry_date}
                    tilt={tiltOf(q.id, 3)}
                    tone={pickOf(q.id, NOTE_TONES)}
                    className={cn("hover:[transform:rotate(0deg)_translateY(-4px)]")}
                  >
                    {audio && <VoiceNote src={audio.url} duration={audio.duration} className="mt-1" />}
                  </StickyNote>
                </Reveal>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
