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

/** 解锁：读者密码或作者口令都能翻开本子；作者口令同时拿到笔。
 *  作者会话是限时的（默认 AUTHOR_SESSION_HOURS 小时，勾 remember 才 30 天），
 *  读者会话照旧长期有效 */
export async function POST(req: Request) {
  // /api/lock 和 /api/pen 共用一个失败计数：换端口继续试也算同一把
  const rlKey = `pw:${clientIp(req)}`;
  if (rateLimited(rlKey)) {
    return NextResponse.json({ error: "试得有点多，歇 10 分钟再来吧" }, { status: 429 });
  }
  const { password, remember } = (await req.json().catch(() => ({}))) as {
    password?: string;
    remember?: boolean;
  };
  const isReaderPw = checkPassword("reader", password);
  const isAuthorPw = checkPassword("author", password);
  if (!isReaderPw && !isAuthorPw) {
    rateLimitFail(rlKey);
    return NextResponse.json({ error: "密码好像不对哦，再想想？" }, { status: 401 });
  }
  rateLimitOk(rlKey);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(READER_COOKIE, tokenFor("reader"), COOKIE_OPTS);
  if (isAuthorPw) {
    res.cookies.set(AUTHOR_COOKIE, authorToken(), authorCookieOpts(remember === true));
  }
  return res;
}

/** 合上本子 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(READER_COOKIE);
  res.cookies.delete(AUTHOR_COOKIE);
  return res;
}
