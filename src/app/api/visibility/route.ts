import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAuthor, isReader } from "@/lib/auth";
import { canShePublish } from "@/lib/permissions";
import { nowISO } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_RE = /^[a-f0-9]{8,16}$/;

/** 批量设置公开/仅她（作者）：「本子里的一切」勾一排历史内容，一次放开或收回 */
export async function POST(req: Request) {
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { entryIds?: unknown; milestoneIds?: unknown; visibility?: unknown }
    | null;
  if (!body) return NextResponse.json({ error: "参数不对" }, { status: 400 });
  const visibility = body.visibility === "public" ? "public" : "private";
  let entryIds = Array.isArray(body.entryIds)
    ? [...new Set(body.entryIds.filter((x): x is string => typeof x === "string" && ID_RE.test(x)))]
    : [];
  let milestoneIds = Array.isArray(body.milestoneIds)
    ? [...new Set(body.milestoneIds.filter((x): x is string => typeof x === "string" && ID_RE.test(x)))]
    : [];
  if (entryIds.length === 0 && milestoneIds.length === 0) {
    return NextResponse.json({ error: "先勾选要改的内容" }, { status: 400 });
  }

  // 她只能批量动被授予发表的类型（按条目实际类型过滤，拼贴页按手账页算；他不限）
  if (!(await isAuthor())) {
    if (milestoneIds.length > 0 && !canShePublish("milestone")) milestoneIds = [];
    entryIds = entryIds.filter((id) => {
      const row = db.prepare("SELECT type FROM entries WHERE id = ?").get(id) as { type?: string } | undefined;
      return row ? canShePublish(row.type ?? "") : false;
    });
    if (entryIds.length === 0 && milestoneIds.length === 0) {
      return NextResponse.json({ error: "她还不能动这类内容" }, { status: 403 });
    }
  }

  const now = nowISO();
  const apply = db.transaction(() => {
    if (entryIds.length > 0) {
      const stmt = db.prepare("UPDATE entries SET visibility = ?, updated_at = ? WHERE id = ?");
      for (const id of entryIds) stmt.run(visibility, now, id);
    }
    if (milestoneIds.length > 0) {
      const stmt = db.prepare("UPDATE milestones SET visibility = ?, updated_at = ? WHERE id = ?");
      for (const id of milestoneIds) stmt.run(visibility, now, id);
    }
  });
  apply();
  return NextResponse.json({
    ok: true,
    visibility,
    entries: entryIds.length,
    milestones: milestoneIds.length,
  });
}
