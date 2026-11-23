import { NextResponse } from "next/server";
import { isAuthor, isReader } from "@/lib/auth";
import { canShePublish } from "@/lib/permissions";
import { createScreening, listScreenings } from "@/lib/screenings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 放映室场次（作者管理用）：全部场次含未首映 */
export async function GET() {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  return NextResponse.json({ screenings: listScreenings({ includeUnpublished: true }) });
}

/** 排一场新放映：传做好的完整视频 */
export async function POST(req: Request) {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  // 她只有被授予「排片」才能发新片；他不限
  if (!(await isAuthor()) && !canShePublish("screening")) {
    return NextResponse.json({ error: "她还不能动这类内容" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { title?: string; subtitle?: string; premiereAt?: string; mediaId?: string; coverMediaId?: string; visibility?: string }
    | null;
  if (!body?.title || !body.premiereAt || !body.mediaId) {
    return NextResponse.json({ error: "片名、首映日期和视频都要填" }, { status: 400 });
  }
  try {
    const s = createScreening({
      title: body.title,
      subtitle: body.subtitle,
      premiereAt: body.premiereAt,
      mediaId: body.mediaId,
      coverMediaId: body.coverMediaId ?? null,
      visibility: body.visibility === "public" ? "public" : "private",
    });
    return NextResponse.json({ screening: s });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "没排上，再试一次？" }, { status: 400 });
  }
}
