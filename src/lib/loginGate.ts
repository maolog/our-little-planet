import { NextResponse } from "next/server";
import {
  AUTHOR_COOKIE,
  COOKIE_OPTS,
  READER_COOKIE,
  authorCookieOpts,
  authorToken,
  tokenFor,
} from "@/lib/auth";
import { clientIp, rateLimitFail, rateLimitOk, rateLimited } from "@/lib/rateLimit";

/** 登录请求体：/api/desk 比另外两个门多一个身份字段 */
export type LoginBody = { identity?: string; password?: string; remember?: boolean };

export type GateResult = { ok: true; body: LoginBody } | { ok: false; res: NextResponse };

/** 三个登录接口（/api/lock、/api/desk、/api/pen）共用的门：
 *  限流 → 读 body → 前置校验（400 级，不计失败）→ 验密码。
 *  失败计数共用一把 `pw:${ip}`——验的是同一对密码，分开算会让同一 IP 的总试错配额翻倍。
 *  验密码失败记一次失败并 401；通过则清零，不会误伤忘了密码多试几次的真人。 */
export async function passwordGate(
  req: Request,
  opts: {
    /** 验密码；false 记一次失败并回 401（error 文案由调用方按各门口径给） */
    verify: (body: LoginBody) => boolean;
    failMsg: string;
    /** 前置校验（如 /desk 先认身份）：返回响应就直接回，不消耗失败配额 */
    preCheck?: (body: LoginBody) => NextResponse | null;
  }
): Promise<GateResult> {
  const rlKey = `pw:${clientIp(req)}`;
  if (rateLimited(rlKey)) {
    return { ok: false, res: NextResponse.json({ error: "试得有点多，歇 10 分钟再来吧" }, { status: 429 }) };
  }
  const body = (await req.json().catch(() => ({}))) as LoginBody;
  const pre = opts.preCheck?.(body);
  if (pre) return { ok: false, res: pre };
  if (!opts.verify(body)) {
    rateLimitFail(rlKey);
    return { ok: false, res: NextResponse.json({ error: opts.failMsg }, { status: 401 }) };
  }
  rateLimitOk(rlKey);
  return { ok: true, body };
}

/** 下发会话 cookie：读者会话谁登录都发（长期有效）；
 *  作者笔按 remember 定——默认限时（AUTHOR_SESSION_HOURS 小时），勾了才 30 天 */
export function issueSession(
  res: NextResponse,
  opts: { reader?: boolean; author?: boolean; remember?: boolean }
): void {
  if (opts.reader) res.cookies.set(READER_COOKIE, tokenFor("reader"), COOKIE_OPTS);
  if (opts.author) res.cookies.set(AUTHOR_COOKIE, authorToken(), authorCookieOpts(opts.remember === true));
}

/** 退出：/api/lock 和 /api/desk 的 DELETE 共用——两把 cookie 一起收走 */
export function logoutResponse(): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(READER_COOKIE);
  res.cookies.delete(AUTHOR_COOKIE);
  return res;
}
