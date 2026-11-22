import { NextResponse } from "next/server";
import { isReader } from "@/lib/auth";
import { listStickers } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 贴纸库（作者）：上传过的贴纸图，编辑拼贴页时直接复用 */
export async function GET() {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  const stickers = listStickers().map((row) => ({
    id: row.id,
    url: `/api/media/${row.id}`,
    width: row.width,
    height: row.height,
  }));
  return NextResponse.json({ stickers });
}
