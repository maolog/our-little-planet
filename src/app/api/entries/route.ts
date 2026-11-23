import { NextResponse } from "next/server";
import { isAuthor, isReader } from "@/lib/auth";
import { canShePublish } from "@/lib/permissions";
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
  // 她只有被授予发表的类型才能发（越权类型在这拦下；他不限，类型没给则由 createEntry 报 400）
  const author = await isAuthor();
  if (!author && typeof body.type === "string" && !canShePublish(body.type)) {
    return NextResponse.json({ error: "她还不能动这类内容" }, { status: 403 });
  }
  try {
    // 记下是谁发的：作者口令 = 他，读者密码 = 她（旧数据默认 author）
    const entry = createEntry({ ...body, createdBy: author ? "author" : "reader" });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存失败了" }, { status: 400 });
  }
}
