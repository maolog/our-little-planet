import type { Metadata } from "next";
import Link from "next/link";
import { listAlbum } from "@/lib/entries";
import { isAuthor, isReader } from "@/lib/auth";
import { getSettings, sectionOpen } from "@/lib/settings";
import { listAllTags } from "@/lib/tagStore";
import { AlbumGrid } from "@/components/album/AlbumGrid";
import { DoodleDivider } from "@/components/journal/DoodleDivider";
import { Sticker } from "@/components/journal/Sticker";
import { AddEntryButton } from "@/components/AddEntryButton";
import { GuestLock } from "@/components/GuestLock";
import { recordGuestVisitFor } from "@/lib/visitors";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: tWith(await getLocale(), "album.title") };
}

export default async function AlbumPage() {
  await recordGuestVisitFor("/album");
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const [reader, author, settings] = [await isReader(), await isAuthor(), getSettings()];
  if (!reader && !sectionOpen(settings, "album")) return <GuestLock section={t("nav.tab.album")} />;
  // 访客只看得到公开页上的照片
  const photos = await Promise.resolve(listAlbum({ guest: !reader }));
  const knownTags = author ? listAllTags() : [];

  return (
    <div className="py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold">{t("album.title")}</h1>
        <p className="mt-3 text-ink-soft">{t("album.subtitle", { n: photos.length })}</p>
        <DoodleDivider variant="wave" className="mx-auto mt-6" />
        {author && (
          <div className="mt-6">
            <AddEntryButton href="/write?type=photo" icon="camera" label={t("album.add")} />
          </div>
        )}
      </header>

      {photos.length === 0 ? (
        <div className="card-paper mx-auto mt-16 flex max-w-md flex-col items-center gap-4 py-14 text-center">
          <Sticker name="star" className="size-12 text-butter" />
          <p className="text-ink-soft">{reader ? t("album.emptyReader") : t("album.emptyGuest")}</p>
          {author && (
            <Link href="/write?type=photo" className="btn-primary">
              {t("album.addFirst")}
            </Link>
          )}
        </div>
      ) : (
        <AlbumGrid photos={photos} author={author} knownTags={knownTags} />
      )}
    </div>
  );
}
