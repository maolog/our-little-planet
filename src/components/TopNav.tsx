"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChatTeardropText,
  DotsThree,
  EnvelopeSimple,
  FilmSlate,
  Heart,
  HouseSimple,
  Images,
  Lock,
  Notebook,
  Path,
  PencilSimple,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import type { SectionKey } from "@/lib/settings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaletteToggle } from "@/components/PaletteToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import { READER_NAME } from "@/lib/reader";
import { useT } from "@/i18n/LocaleProvider";
import type { Dict } from "@/i18n";

const TABS = [
  { href: "/", section: "home" as SectionKey, labelKey: "nav.tab.home" as keyof Dict, icon: HouseSimple, active: "bg-butter text-ink" },
  { href: "/journal", section: "journal" as SectionKey, labelKey: "nav.tab.journal" as keyof Dict, icon: Notebook, active: "bg-matcha text-ink" },
  { href: "/album", section: "album" as SectionKey, labelKey: "nav.tab.album" as keyof Dict, icon: Images, active: "bg-mist text-ink" },
  { href: "/quotes", section: "quotes" as SectionKey, labelKey: "nav.tab.quotes" as keyof Dict, icon: ChatTeardropText, active: "bg-peach text-ink" },
  { href: "/letters", section: "letters" as SectionKey, labelKey: "nav.tab.letters" as keyof Dict, icon: EnvelopeSimple, active: "bg-rose-soft text-rose-deep" },
  { href: "/timeline", section: "timeline" as SectionKey, labelKey: "nav.tab.timeline" as keyof Dict, icon: Path, active: "bg-butter text-ink" },
  { href: "/screenings", section: "screenings" as SectionKey, labelKey: "nav.tab.screenings" as keyof Dict, icon: FilmSlate, active: "bg-ink/10 text-ink" },
] as const;

/** 页签 / 「更多」/「记一笔」共用的排版底子：隐形量尺里的副本必须和真身一字不差，量出来的宽度才准 */
const TAB_BASE =
  "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-bold transition-all duration-300 ease-spring sm:px-3.5 sm:text-sm";
const CTA_BASE = `ml-0.5 ${TAB_BASE}`;

type HeartDrop = { x: number; size: number; dur: number; delay: number; drift: number; rot: number };

/** 手账侧边的彩色索引贴导航。
 *  访客（没输过密码）只看得到设为「公开」的栏目；没公开的栏目直接不出现，
 *  右端给访客留一枚小锁进「她的专属」。
 *  藏了一个彩蛋：2.5 秒内连点 5 下左上角的小爱心，会下一小阵爱心雨（20 秒内只灵一次） */
export function TopNav({
  title,
  author,
  reader = false,
  sections,
  sheMenus,
}: {
  title: string;
  author: boolean;
  /** 她本人（读者或作者）＝看得到全部栏目（作者不传 sheMenus，不受限） */
  reader?: boolean;
  /** 各栏目对访客是否公开（读者登录后忽略） */
  sections?: Partial<Record<SectionKey, boolean>>;
  /** 她登录后被授权的菜单项（settings.sheMenuKeys）；传了就按它滤栏目和「记一笔」 */
  sheMenus?: readonly string[];
}) {
  const pathname = usePathname();
  const t = useT();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const reduce = useReducedMotion();
  const [rain, setRain] = useState<{ id: number; drops: HeartDrop[] } | null>(null);
  const taps = useRef<number[]>([]);
  const cooldownUntil = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onLogoTap() {
    const now = Date.now();
    taps.current = taps.current.filter((t) => now - t < 2500);
    taps.current.push(now);
    if (taps.current.length < 5 || now < cooldownUntil.current || reduce) return;
    taps.current = [];
    cooldownUntil.current = now + 20_000;
    const drops: HeartDrop[] = Array.from({ length: 26 }, () => ({
      x: 2 + Math.random() * 96,
      size: 14 + Math.random() * 16,
      dur: 2.4 + Math.random() * 1.4,
      delay: Math.random() * 0.9,
      drift: (Math.random() - 0.5) * 80,
      rot: (Math.random() - 0.5) * 50,
    }));
    setRain({ id: now, drops });
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setRain(null), 4500);
  }

  // 访客只看公开栏目；她按 sheMenuKeys 滤（作者不传＝全看）
  const visibleTabs = reader
    ? TABS.filter((t) => !sheMenus || sheMenus.includes(t.section))
    : TABS.filter((t) => sections?.[t.section] === true);
  const showCta = author || (reader && (!sheMenus || sheMenus.includes("write")));
  /** 页签集合的稳定签名：集合不变时字符串不变，测量 effect 不用每次渲染都重量 */
  const tabKey = visibleTabs.map((tb) => tb.href).join(",");

  // —— 自动收縮：前 cut 个页签平铺，塞不下的折进「更多」（null = 还没量过，先全平铺）——
  const rowRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const moreBoxRef = useRef<HTMLDivElement>(null);
  const [cutCount, setCutCount] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fading, setFading] = useState(false);
  const cut = cutCount === null ? visibleTabs.length : Math.min(cutCount, visibleTabs.length);
  const folded = visibleTabs.slice(cut);
  // 折叠项清空时收起「更多」：按上一轮结果在渲染期调整（仅值变化才触发），不走 effect 免级联渲染
  if (folded.length === 0 && moreOpen) setMoreOpen(false);

  /** 量宽度：真页签可能被折起来量不到，所以从隐形量尺（永远渲染全部）里读。
   *  量尺与真身同一套排版类，各元素的 offsetLeft/offsetWidth 连间隙、边距都算进去了 */
  const measure = useCallback(() => {
    const row = rowRef.current;
    const strip = stripRef.current;
    if (!row || !strip || row.clientWidth <= 0) return;
    const tabs = Array.from(strip.querySelectorAll<HTMLElement>('[data-m="tab"]'));
    const moreEl = strip.querySelector<HTMLElement>('[data-m="more"]');
    const ctaEl = strip.querySelector<HTMLElement>('[data-m="cta"]');
    const nTabs = tabs.length;
    if (nTabs === 0 || !moreEl) {
      setCutCount(nTabs);
      return;
    }
    // 活动页签从量尺的 data-href 读：measure 因此不闭包任何响应式值，可以稳定不变
    const path = window.location.pathname;
    const activeIdx = tabs.findIndex((el) => {
      const href = el.dataset.href ?? "/";
      return href === "/" ? path === "/" : path.startsWith(href);
    });
    const origin = tabs[0].offsetLeft;
    const tabsEnd = tabs[nTabs - 1].offsetLeft + tabs[nTabs - 1].offsetWidth;
    const moreEnd = moreEl.offsetLeft + moreEl.offsetWidth;
    const avail = row.clientWidth - 1; // 留 1px 安全边，别差一两像素又冒出滚动条
    // 「记一笔」永远平铺：它跟在「更多」后面，这段 = 间隙 + 边距 + 自身宽度
    const ctaSpace = ctaEl ? ctaEl.offsetLeft + ctaEl.offsetWidth - moreEnd : 0;
    // 全平铺（一个不折）放得下就一个不折
    if (tabsEnd - origin + ctaSpace <= avail) {
      setCutCount(nTabs);
      return;
    }
    // 放不下：先给「更多」留出位置，再从左往右塞页签，塞不下的折进去
    const moreSpace = moreEl.offsetWidth + (moreEl.offsetLeft - tabsEnd);
    const budget = avail - moreSpace - ctaSpace;
    let n = 0;
    for (const el of tabs) {
      if (el.offsetLeft + el.offsetWidth - origin > budget) break;
      n += 1;
    }
    n = Math.max(1, Math.min(n, nTabs)); // 至少平铺第一个；真放不下还有滚动兜底
    // 当前页签不折：它被折进去的话宁可整行溢出可滑，也不把脚下的页藏进「更多」
    if (activeIdx >= n) n = Math.min(activeIdx + 1, nTabs);
    setCutCount(n);
  }, []);

  // 量一次 + 盯容器宽度（窗口缩放/侧栏开合都会惊动 ResizeObserver）；字体加载完重量一遍
  useEffect(() => {
    measure();
    const row = rowRef.current;
    if (!row) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(row);
    document.fonts?.ready.then(() => measure()).catch(() => undefined);
    return () => ro.disconnect();
    // tabKey/语言变化都可能改宽度，跟着重量
  }, [measure, tabKey, t]);

  // 折完后行里真的还溢出才显示右端渐隐边（放得下就不该有「还能滑」的暗示）
  useEffect(() => {
    const row = rowRef.current;
    if (row) setFading(row.scrollWidth > row.clientWidth + 1);
  }, [cut, tabKey, t]);

  // 「更多」点外面关、按 Esc 关；跳了页也关（指向同一路径的链接不会触发 pathname 变化，链接自身 onClick 兜底）
  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreBoxRef.current && !moreBoxRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link href="/" aria-label={title} onClick={onLogoTap} className="flex shrink-0 items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-rose-soft text-rose-deep">
            <Heart weight="fill" className="size-4" />
          </span>
          {/* 手机端只留爱心图标，把空间让给导航标签 */}
          <span className="hidden text-lg font-bold md:inline">{title}</span>
        </Link>
        {/* 页签全放在顶栏（桌面/移动端同一排）。放不下时自动收縮：塞不下的折进「更多」下拉 */}
        <div className="relative min-w-0 flex-1">
          {/* 隐形量尺：永远渲染全部页签 + 「更多」+「记一笔」，量宽度用（不占位、点不着） */}
          <div
            aria-hidden
            ref={stripRef}
            className="invisible pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1 sm:gap-1.5"
          >
            {visibleTabs.map(({ href, labelKey, icon: Icon }) => (
              <span key={href} data-m="tab" data-href={href} className={TAB_BASE}>
                <Icon weight="fill" className="size-4 shrink-0" />
                {t(labelKey)}
              </span>
            ))}
            <span data-m="more" className={TAB_BASE}>
              <DotsThree weight="fill" className="size-4 shrink-0" />
              {t("nav.more")}
            </span>
            {showCta && (
              <span data-m="cta" className={CTA_BASE}>
                <PencilSimple weight="bold" className="size-4 shrink-0" />
                {t("nav.writeCta")}
              </span>
            )}
          </div>
          <div ref={rowRef} className="no-scrollbar flex items-center gap-1 overflow-x-auto sm:gap-1.5">
            {visibleTabs.slice(0, cut).map(({ href, labelKey, icon: Icon, active }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  TAB_BASE,
                  isActive(href)
                    ? cn(active, "-translate-y-px shadow-sm")
                    : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                )}
              >
                <Icon weight="fill" className="size-4 shrink-0" />
                {t(labelKey)}
              </Link>
            ))}
            {folded.length > 0 && (
              <div ref={moreBoxRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-label={t("nav.more")}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  className={cn(
                    TAB_BASE,
                    folded.some((tb) => isActive(tb.href))
                      ? "bg-ink/10 text-ink"
                      : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                  )}
                >
                  <DotsThree weight="fill" className="size-4 shrink-0" />
                  {t("nav.more")}
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.ul
                      role="menu"
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 top-full z-50 mt-2 min-w-36 rounded-2xl border border-ink/10 bg-card p-1.5 shadow-lifted"
                    >
                      {folded.map(({ href, labelKey, icon: Icon, active }) => (
                        <li key={href}>
                          <Link
                            href={href}
                            role="menuitem"
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition",
                              isActive(href) ? active : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                            )}
                          >
                            <Icon weight="fill" className="size-4 shrink-0" />
                            {t(labelKey)}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
            {showCta && (
              <Link
                href="/write"
                className={cn(
                  CTA_BASE,
                  isActive("/write")
                    ? "-translate-y-px bg-rose-deep text-paper shadow-md"
                    : "bg-rose-soft text-rose-deep hover:-translate-y-px"
                )}
              >
                <PencilSimple weight="bold" className="size-4 shrink-0" />
                {t("nav.writeCta")}
              </Link>
            )}
          </div>
          {/* 只有行里真的滑得动才亮渐隐边：收縮后放得下就不该暗示「还能滑」 */}
          {fading && (
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent" />
          )}
        </div>
        {/* 右端常驻：语言 / 配色 / 明暗切换 + 访客的「她的专属」小锁 */}
        <div className="flex shrink-0 items-center gap-0.5">
          <LocaleToggle />
          <PaletteToggle />
          <ThemeToggle />
          {!reader && (
            <Link
              href="/lock"
              aria-label={t("nav.lockAria", { name: READER_NAME })}
              title={t("nav.lockTitle", { name: READER_NAME })}
              className="grid size-8 place-items-center rounded-full text-rose-deep/70 transition hover:bg-rose-soft/60 hover:text-rose-deep"
            >
              <Lock weight="fill" className="size-4" />
            </Link>
          )}
        </div>
      </nav>
      </header>

      {/* 爱心雨：纯装饰，不挡点按。必须挂在 header 外面——header 的 backdrop-blur
          会把 fixed 定位的包含块吃掉，雨就只会下在导航条里而不是全屏 */}
      <AnimatePresence>
        {rain && (
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
            {rain.drops.map((d, i) => (
              <motion.span
                key={`${rain.id}-${i}`}
                className="absolute top-0 text-rose"
                style={{ left: `${d.x}%` }}
                initial={{ y: "-8vh", opacity: 0, rotate: d.rot }}
                animate={{ y: "112vh", opacity: [0, 1, 1], rotate: d.rot * 2, x: d.drift }}
                exit={{ opacity: 0 }}
                transition={{ duration: d.dur, delay: d.delay, ease: "easeIn" }}
              >
                <Heart weight="fill" style={{ width: d.size, height: d.size }} />
              </motion.span>
            ))}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
