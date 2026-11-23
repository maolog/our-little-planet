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
import { canSheSee } from "@/lib/permissions";

/** 隐蔽写作入口的身份验证：先选「他」或「她」，各输各的密码。
 *  他 = 作者口令（最高权限，限时会话）；她 = 读者密码（按她被授予的范围发表/看菜单）。
 *  限流与 /api/lock、/api/pen 共用 pw: 计数：验的是同一对密码，
 *  分开算会让同一 IP 的总试错配额翻倍 */
export async function POST(req: Request) {
  const rlKey = `pw:${clientIp(req)}`;
  if (rateLimited(rlKey)) {
    return NextResponse.json({ error: "试得有点多，歇 10 分钟再来吧" }, { status: 429 });
  }
  const { identity, password, remember } = (await req.json().catch(() => ({}))) as {
    identity?: string;
    password?: string;
    remember?: boolean;
  };
  if (identity !== "he" && identity !== "she") {
    return NextResponse.json({ error: "先选一个身份吧" }, { status: 400 });
  }
  const role = identity === "he" ? "author" : "reader";
  if (!checkPassword(role, password)) {
    rateLimitFail(rlKey);
    return NextResponse.json({ error: "密码好像不对哦，再想想？" }, { status: 401 });
  }
  rateLimitOk(rlKey);
  // next = 登录后的落点，由服务端按权限算好：他永远进写作台；
  // 她只有被授予写作台入口（write/list/marks 任一）才去 /write，否则回首页
  const next =
    identity === "he"
      ? "/write"
      : canSheSee("write") || canSheSee("list") || canSheSee("marks")
        ? "/write"
        : "/";
  const res = NextResponse.json({ ok: true, identity, next });
  if (identity === "he") {
    // 他 = 最高权限：拿作者笔（限时会话），同时天然能读
    res.cookies.set(READER_COOKIE, tokenFor("reader"), COOKIE_OPTS);
    res.cookies.set(AUTHOR_COOKIE, authorToken(), authorCookieOpts(remember === true));
  } else {
    // 她 = 读者会话；能发什么、能看哪些菜单由 settings.she* 决定
    res.cookies.set(READER_COOKIE, tokenFor("reader"), COOKIE_OPTS);
  }
  return res;
}

/** 从写作台悄悄退出 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(READER_COOKIE);
  res.cookies.delete(AUTHOR_COOKIE);
  return res;
}
