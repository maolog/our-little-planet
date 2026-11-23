import { NextResponse } from "next/server";
import { isAuthor, isReader } from "@/lib/auth";
import { canShePublish } from "@/lib/permissions";
import { deleteEntry, getEntry, setEntryVisibility, updateEntry, type EntryInput } from "@/lib/entries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = getEntry(id);
  if (!existing) return NextResponse.json({ error: "这一页不存在" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Partial<EntryInput> | null;
  if (!body) return NextResponse.json({ error: "内容格式不对" }, { status: 400 });
  // 她只能动被授予发表的类型（列表的快捷公开开关也走这里；他不限）
  if (!(await isAuthor()) && (!canShePublish(existing.type) || (typeof body.type === "string" && !canShePublish(body.type)))) {
    return NextResponse.json({ error: "她还不能动这类内容" }, { status: 403 });
  }

  // 「本子里的一切」列表上的快捷开关：只带 visibility 一个字段
  if (body.visibility && typeof body.body !== "string") {
    setEntryVisibility(id, body.visibility === "public" ? "public" : "private");
    return NextResponse.json({ entry: getEntry(id) });
  }
  if (typeof body.body !== "string") {
    return NextResponse.json({ error: "内容格式不对" }, { status: 400 });
  }
  try {
    const entry = updateEntry(id, body as EntryInput);
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "保存失败了" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = getEntry(id);
  if (!(await isAuthor()) && existing && !canShePublish(existing.type)) {
    return NextResponse.json({ error: "她还不能动这类内容" }, { status: 403 });
  }
  deleteEntry(id);
  return NextResponse.json({ ok: true });
}
