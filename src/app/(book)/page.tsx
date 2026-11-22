import Link from "next/link";
import { ArrowRight, Images, Lock } from "@phosphor-icons/react/dist/ssr";
import { getSettings, sectionVisibility, type SectionKey } from "@/lib/settings";
import { listEntries, listPhotos, listAlbum, countPhotos } from "@/lib/entries";
import { findMemory } from "@/lib/memories";
import { isAuthor, isReader } from "@/lib/auth";
import { hashCode, pickOf, tiltOf } from "@/lib/tilt";
import { DayCounter } from "@/components/home/DayCounter";
import { HomeHero, type HeroQuote } from "@/components/home/HomeHero";
import { MemoryCard } from "@/components/home/MemoryCard";
import { AnniversaryCalendar } from "@/components/home/AnniversaryCalendar";
import { MonthSettlement, type MonthStats } from "@/components/home/MonthSettlement";
import { NightSky } from "@/components/home/NightSky";
import { ScribbleTitle } from "@/components/home/ScribbleTitle";
import { SnapRail } from "@/components/home/SnapRail";
import { TimeGreeting } from "@/components/home/TimeGreeting";
import { PolaroidCard } from "@/components/journal/PolaroidCard";
import { Sticker } from "@/components/journal/Sticker";
import { DoodleDivider } from "@/components/journal/DoodleDivider";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";
import { Reveal } from "@/components/Reveal";
import { recordGuestVisitFor } from "@/lib/visitors";
import { READER_NAME } from "@/lib/reader";
import { getLocale, tWith } from "@/i18n/server";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";

/** 洗牌：首页大拍立得和语录便利贴每次进来都随机翻牌 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SECTION_LINKS: { key: SectionKey; href: string; labelKey: keyof Dict }[] = [
  { key: "journal", href: "/journal", labelKey: "nav.tab.journal" },
  { key: "album", href: "/album", labelKey: "nav.tab.album" },
  { key: "quotes", href: "/quotes", labelKey: "nav.tab.quotes" },
  { key: "letters", href: "/letters", labelKey: "nav.tab.letters" },
  { key: "timeline", href: "/timeline", labelKey: "nav.tab.timeline" },
  { key: "screenings", href: "/screenings", labelKey: "nav.tab.screenings" },
];

/** 访客的落地页：首页没公开时，给一间小小的客厅——一句欢迎话、
 *  公开的栏目门牌、和一扇只有她能开的门 */
function GuestLanding({
  settings,
  sections,
  locale,
}: {
  settings: ReturnType<typeof getSettings>;
  sections: Record<SectionKey, boolean>;
  locale: Locale;
}) {
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const openSections = SECTION_LINKS.filter((s) => sections[s.key]);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <NightSky />
      <p className="font-script text-2xl text-rose-deep">{t("home.journalOf", { names: settings.names })}</p>
      <ScribbleTitle title={settings.title} />
      <p className="mt-8 max-w-md text-ink-soft">
        {settings.guestWelcome?.trim() || t("home.guestWelcome")}
      </p>
      {openSections.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {openSections.map((s) => (
            <Link key={s.key} href={s.href} className="btn-ghost">
              {t(s.labelKey)}
              <ArrowRight weight="bold" className="size-3.5" />
            </Link>
          ))}
        </div>
      )}
      <DoodleDivider variant="hearts" className="mt-12 w-28" />
      <Link href="/lock" className="btn-primary mt-10">
        <Lock weight="bold" className="size-4" />
        {t("nav.lockAria", { name: READER_NAME })}
      </Link>
      <p className="mt-4 font-script text-xl text-ink-soft/60">{t("home.psst")}</p>
    </div>
  );
}

export default async function HomePage() {
  await recordGuestVisitFor("/");
  const locale = await getLocale();
  const t = (key: keyof Dict, params?: Record<string, string | number>) => tWith(locale, key, params);
  const [settings, author, reader] = [getSettings(), await isAuthor(), await isReader()];
  const sections = sectionVisibility(settings);
  // 首页没对访客公开：给落地页
  if (!reader && !sections.home) return <GuestLanding settings={settings} sections={sections} locale={locale} />;
  const guest = !reader;

  // 「最近的一页」只看手账内容（手账页/自由拼贴页）；语录单独取最新的那句。
  // 访客只看公开内容
  const latestEntry = listEntries({ excludeTypes: ["photo", "quote", "letter"], limit: 1, guest })[0];
  const photos = listPhotos({ guest }).slice(0, 8);
  const photoTotal = countPhotos({ guest });
  // 大拍立得 + 便利贴语录：随机翻牌，客户端每 5 秒再换（HomeHero 里轮换）
  const heroPool = shuffle(listPhotos({ guest }));
  const quotePool: HeroQuote[] = shuffle(
    listEntries({ type: "quote", limit: 200, guest }).map((q) => ({ id: q.id, body: q.body, speaker: q.speaker }))
  );
  // 「这本本子记得」：从过去月份的同一天前后翻一张旧日子出来（信不参与，它们住在信箱里）
  const memory = findMemory(listEntries({ excludeTypes: ["letter"], guest }));

  // 「本月我们」结算单：当前月份的实时统计（金句按月哈希挑一句，月内不变）
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthEntries = listEntries({ guest }).filter((e) => e.entry_date.startsWith(monthKey));
  const monthAlbum = listAlbum({ guest }).filter((p) => p.entryDate.startsWith(monthKey));
  const monthQuotes = monthEntries.filter((e) => e.type === "quote");
  const quoteOfMonth = monthQuotes.length > 0 ? monthQuotes[hashCode(monthKey) % monthQuotes.length] : null;
  const monthStats: MonthStats = {
    monthKey,
    photos: monthAlbum.filter((p) => p.kind === "photo").length,
    videos: monthAlbum.filter((p) => p.kind === "video").length,
    pages: monthEntries.filter((e) => e.type === "journal" || e.type === "board").length,
    quotes: monthQuotes.length,
    letters: monthEntries.filter((e) => e.type === "letter").length,
    quote: quoteOfMonth ? { body: quoteOfMonth.body, speaker: quoteOfMonth.speaker } : null,
  };

  return (
    <div className="py-8 sm:py-12">
      {/* 摊开的第一页 */}
      <section className="relative grid items-center gap-14 py-8 sm:py-12 lg:min-h-[calc(100dvh-14rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <NightSky />
        <div>
          <p className="font-script text-2xl text-rose-deep">{t("home.journalOf", { names: settings.names })}</p>
          <ScribbleTitle title={settings.title} />
          <DayCounter startDate={settings.startDate} className="mt-10" />
          <TimeGreeting startDate={settings.startDate} className="mt-4" />
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {sections.album && (
              <Link href="/album" className="btn-primary">
                <Images weight="fill" className="size-5" />
                {t("home.ctaAlbum")}
              </Link>
            )}
            {sections.journal && (
              <Link href="/journal" className="btn-ghost">
                {t("home.ctaJournal")}
                <ArrowRight weight="bold" className="size-4" />
              </Link>
            )}
          </div>
        </div>

        <HomeHero photos={heroPool} quotes={quotePool} author={author} />
      </section>

      {/* 这本本子记得：N 个月前的今天 */}
      {memory && (
        <Reveal>
          <MemoryCard memory={memory} />
        </Reveal>
      )}

      {/* 最近的一页 */}
      <section className="mt-16 py-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">{t("home.recentTitle")}</h2>
          {sections.journal && (
            <Link href="/journal" className="link-soft text-sm">
              {t("home.browseAll")}
              <ArrowRight weight="bold" className="size-3.5" />
            </Link>
          )}
        </div>
        {latestEntry ? (
          <Reveal>
            <JournalEntryCard entry={latestEntry} author={author} reader={reader} compact />
          </Reveal>
        ) : (
          <div className="card-paper flex flex-col items-center gap-4 py-14 text-center">
            <Sticker name="cloud" className="size-12 text-mist" />
            <p className="text-ink-soft">{reader ? t("home.emptyFresh") : t("home.emptyGuest")}</p>
            {author && (
              <Link href="/write?type=journal" className="btn-primary">
                {t("home.writeFirst")}
              </Link>
            )}
          </div>
        )}
      </section>

      {/* 最近贴上的拍立得 */}
      {photos.length > 0 && (
        <section className="mt-8 py-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold">{t("home.polaroidTitle")}</h2>
            <p className="font-round text-sm tracking-wider text-ink-soft">
              {t("home.photoTotal", { n: photoTotal })}
            </p>
          </div>
          <SnapRail>
            {photos.map((p) => (
              <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48">
                <PolaroidCard
                  src={p.thumbUrl ?? p.url}
                  caption={p.caption}
                  alt={p.caption ?? t("home.photoAlt")}
                  tilt={tiltOf(p.id)}
                  tone={pickOf(p.id, ["rose", "butter", "mist", "peach", "matcha"])}
                  tape="none"
                  width={p.width}
                  height={p.height}
                  liveVideo={p.liveVideo}
                />
              </div>
            ))}
          </SnapRail>
          <DoodleDivider variant="wave" className="mx-auto" />
        </section>
      )}

      {/* 重要的日子：整百天 / 520 / 1314 / 周年 + 情人节、七夕这些记号 */}
      <Reveal>
        <AnniversaryCalendar startDate={settings.startDate} today={today} />
      </Reveal>

      {/* 「本月我们」结算单 */}
      <Reveal>
        <MonthSettlement stats={monthStats} />
      </Reveal>
    </div>
  );
}
