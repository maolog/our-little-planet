import type { Metadata } from "next";
import "lxgw-wenkai-webfont/style.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import "@fontsource/baloo-2/500.css";
import "@fontsource/baloo-2/700.css";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { getLocale } from "@/i18n/server";
import { translate } from "@/i18n";
import { LOCALE_HTML_LANG } from "@/i18n/config";
import { ChunkReloadGuard } from "@/components/ChunkReloadGuard";
import { DemoBadge } from "@/components/DemoBadge";
import { DEMO_RESET_MINUTES, IS_DEMO } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** metadata 按 cookie 语言本地化（layout 是 force-dynamic，可读 cookie） */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    title: {
      default: translate(locale, "meta.siteTitle"),
      template: translate(locale, "meta.siteTitleTemplate"),
    },
    description: translate(locale, "meta.siteDescription"),
    robots: { index: false, follow: false },
  };
}

/** 首帧定明暗 + 配色：存过偏好就用偏好，明暗没存过跟系统走。放在 head 内联执行，避免闪一下白纸 */
const THEME_INIT = `try{var t=localStorage.getItem("journal-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");var p=localStorage.getItem("journal-palette");if(p&&p!=="rose"&&/^(sakura|lavender|peach)$/.test(p))document.documentElement.setAttribute("data-palette",p)}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 首帧 lang 跟随 cookie（客户端切换语言后由 LocaleProvider 更新）
  const locale = await getLocale();
  return (
    <html lang={LOCALE_HTML_LANG[locale]} className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* 请求 OSS 图片/音频时不要带 Referer：桶开了防盗链，只认白名单域名和空 Referer，
            这样本地 localhost 调试、换域名部署都不会被 403 拦裂图 */}
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="flex min-h-full flex-col">
        {/* 纸张纹理：盖在最上层但不挡交互 */}
        <div className="grain" aria-hidden />
        <ChunkReloadGuard />
        {IS_DEMO && (
          <DemoBadge
            resetMinutes={DEMO_RESET_MINUTES}
            readerPassword={process.env.READER_PASSWORD ?? "0520"}
            authorPassword={process.env.AUTHOR_PASSWORD ?? "write-for-her"}
          />
        )}
        <LocaleProvider>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
