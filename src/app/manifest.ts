import type { MetadataRoute } from "next";
import { translate } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getSettings } from "@/lib/settings";

/** PWA 清单：Next 自动挂在 /manifest.webmanifest 并注入 <link rel="manifest">。
 *  名字取后台「本子信息」的本子名，描述按 cookie 语言本地化（读 locale 即动态渲染）。 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const locale = await getLocale();
  const title = getSettings().title.trim() || translate(locale, "meta.siteTitle");
  return {
    name: title,
    short_name: title,
    description: translate(locale, "meta.siteDescription"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff9f0",
    theme_color: "#fff9f0",
    lang: locale,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
