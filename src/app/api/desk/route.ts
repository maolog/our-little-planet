import { NextResponse } from "next/server";
import { checkPassword } from "@/lib/auth";
import { canSheSee } from "@/lib/permissions";
import { issueSession, logoutResponse, passwordGate } from "@/lib/loginGate";

/** 隐蔽写作入口的身份验证：先选「他」或「她」，各输各的密码。
 *  他 = 作者口令（最高权限，限时会话）；她 = 读者密码（按她被授予的范围发表/看菜单）。
 *  限流与身份前置校验都在 loginGate 里（共用 pw: 失败计数） */
export async function POST(req: Request) {
  const gate = await passwordGate(req, {
    preCheck: (b) =>
      b.identity !== "he" && b.identity !== "she"
        ? NextResponse.json({ error: "先选一个身份吧" }, { status: 400 })
        : null,
    verify: (b) => checkPassword(b.identity === "he" ? "author" : "reader", b.password),
    failMsg: "密码好像不对哦，再想想？",
  });
  if (!gate.ok) return gate.res;
  const identity = gate.body.identity as "he" | "she";
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
    issueSession(res, { reader: true, author: true, remember: gate.body.remember });
  } else {
    // 她 = 读者会话；能发什么、能看哪些菜单由 settings.she* 决定
    issueSession(res, { reader: true });
  }
  return res;
}

/** 从写作台悄悄退出 */
export async function DELETE() {
  return logoutResponse();
}
