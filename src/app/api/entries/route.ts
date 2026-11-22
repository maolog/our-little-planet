import { NextResponse } from "next/server";
import { isAuthor, isReader } from "@/lib/auth";
import { createEntry, listEntries, type EntryInput } from "@/lib/entries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  // 写作台视角：草稿和定时未到的都看得到
  return NextResponse.json({ entries: listEntries({ includeDrafts: true }) });
}

export async function POST(req: Request) {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as EntryInput | null;
  if (!body || typeof body.body !== "string") {
    return NextResponse.json({ error: "内容格式不对" }, { status: 400 });
  }
  try {
    // 记下是谁发的：作者口令 = 他，读者密码 = 她（旧数据默认 author）
    const entry = createEntry({ ...body, createdBy: (await isAuthor()) ? "author" : "reader" });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存失败了" }, { status: 400 });
  }
}
