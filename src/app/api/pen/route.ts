import { NextResponse } from "next/server";
import {
  AUTHOR_COOKIE,
  COOKIE_OPTS,
  READER_COOKIE,
  authorCookieOpts,
  authorToken,
  checkPassword,
  tokenFor,
} from "@/lib/auth";
import { clientIp, rateLimited, rateLimitFail, rateLimitOk } from "@/lib/rateLimit";

/** 拿起笔：作者口令，拿到写手账的权限（同时也算解开本子）。
 *  笔是限时的：默认 AUTHOR_SESSION_HOURS 小时后收回，勾了 remember 才 30 天 */
export async function POST(req: Request) {
  const rlKey = `pw:${clientIp(req)}`; // 与 /api/lock 共用失败计数
  if (rateLimited(rlKey)) {
    return NextResponse.json({ error: "试得有点多，歇 10 分钟再来吧" }, { status: 429 });
  }
  const { password, remember } = (await req.json().catch(() => ({}))) as {
    password?: string;
    remember?: boolean;
  };
  if (!checkPassword("author", password)) {
    rateLimitFail(rlKey);
    return NextResponse.json({ error: "这不是作者的口令哦" }, { status: 401 });
  }
  rateLimitOk(rlKey);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTHOR_COOKIE, authorToken(), authorCookieOpts(remember === true));
  res.cookies.set(READER_COOKIE, tokenFor("reader"), COOKIE_OPTS);
  return res;
}
