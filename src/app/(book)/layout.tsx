import { isAuthor, isReader } from "@/lib/auth";
import { getSettings, sectionVisibility } from "@/lib/settings";
import { sheMenuKeys } from "@/lib/permissions";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { BackToTop } from "@/components/BackToTop";

/** 手账本组：不登录也能进（访客模式，只看得到标了公开的栏目和内容）；
 *  她专属的部分在数据层拦——各页查询按访客身份过滤，未公开的内容根本不会渲染 */
export default async function BookLayout({ children }: { children: React.ReactNode }) {
  const [reader, author, settings] = [await isReader(), await isAuthor(), getSettings()];
  // 她的导航按 sheMenuKeys 滤；他（作者）看全部，不传受限菜单
  const sheMenus = reader && !author ? Array.from(sheMenuKeys(settings)) : undefined;

  return (
    <>
      <TopNav
        title={settings.title}
        author={author}
        reader={reader}
        sections={sectionVisibility(settings)}
        sheMenus={sheMenus}
      />
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-8 sm:px-6">{children}</main>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <SiteFooter reader={reader} />
      </div>
      <BackToTop />
    </>
  );
}
