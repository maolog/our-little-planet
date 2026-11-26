import { redirect } from "next/navigation";
import { isAuthor, isReader } from "@/lib/auth";
import { canSheEnterWriteDesk } from "@/lib/permissions";
import { DeskForm } from "@/components/desk/DeskForm";
import { Sticker } from "@/components/journal/Sticker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PaletteToggle } from "@/components/PaletteToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import { recordGuestVisitFor } from "@/lib/visitors";
import { IS_DEMO } from "@/lib/demo";
import { getLocale } from "@/i18n/server";
import { translate } from "@/i18n";

/** 隐蔽写作入口：先选「他/她」再各输各的密码（区别于 /lock 单框双密码）。
 *  已登录的直接按权限落座：他去写作台；她有写作台任一入口（write/list/marks）
 *  也去写作台，否则回首页——与 /api/desk 算 next 的规则一致 */
export default async function DeskPage() {
  await recordGuestVisitFor("/desk");
  if (await isReader()) {
    const toWrite = (await isAuthor()) || canSheEnterWriteDesk();
    redirect(toWrite ? "/write" : "/");
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <Sticker name="star" className="absolute left-[13%] top-[16%] size-9 rotate-6 text-butter" />
        <Sticker name="heart" className="absolute right-[14%] top-[22%] size-8 rotate-[-10deg] text-rose/50" />
        <Sticker name="coffee" className="absolute bottom-[18%] left-[16%] size-12 rotate-[-6deg] text-matcha/80" />
        <Sticker name="sparkle" className="absolute bottom-[24%] right-[13%] size-10 rotate-12 text-mist/70" />
      </div>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
        <LocaleToggle className="rounded-full bg-paper/60 backdrop-blur" />
        <PaletteToggle className="rounded-full bg-paper/60 backdrop-blur" />
        <ThemeToggle className="bg-paper/60 backdrop-blur" />
      </div>
      <DeskForm
        demoHint={
          IS_DEMO
            ? translate(await getLocale(), "desk.demoHint", {
                he: process.env.AUTHOR_PASSWORD ?? "write-for-her",
                she: process.env.READER_PASSWORD ?? "0520",
              })
            : undefined
        }
      />
    </main>
  );
}
