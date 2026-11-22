import { NextResponse } from "next/server";
import { COOKIE_OPTS, eggCookieName, safeEqual, tokenFor } from "@/lib/auth";
import { getEgg } from "@/lib/eggs";
import { todayLocal } from "@/lib/ids";
import { clientIp, rateLimited, rateLimitFail, rateLimitOk } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 单个彩蛋解锁：必须已到揭晓日期 + 该彩蛋的密码正确 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const egg = getEgg(id);
  if (!egg) return NextResponse.json({ error: "这个彩蛋不存在" }, { status: 404 });
  if (todayLocal() < egg.revealDate) {
    return NextResponse.json({ error: "还没到打开的时候" }, { status: 403 });
  }
  const rlKey = `egg:${id}:${clientIp(req)}`; // 每个彩蛋单独计数（密码各不相同）
  if (rateLimited(rlKey)) {
    return NextResponse.json({ error: "试得有点多，歇 10 分钟再来吧" }, { status: 429 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (typeof password !== "string" || !safeEqual(password, egg.password)) {
    rateLimitFail(rlKey);
    return NextResponse.json({ error: "这串密码不对哦，再想想？" }, { status: 401 });
  }
  rateLimitOk(rlKey);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(eggCookieName(id), tokenFor(`egg:${id}`), COOKIE_OPTS);
  return res;
}
