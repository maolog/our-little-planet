import { NextResponse } from "next/server";
import { checkPassword } from "@/lib/auth";
import { issueSession, logoutResponse, passwordGate } from "@/lib/loginGate";

/** 解锁：读者密码或作者口令都能翻开本子；作者口令同时拿到笔。
 *  会话与限流细节收在 loginGate 里（与 /api/desk、/api/pen 共用） */
export async function POST(req: Request) {
  const gate = await passwordGate(req, {
    verify: (b) => checkPassword("reader", b.password) || checkPassword("author", b.password),
    failMsg: "密码好像不对哦，再想想？",
  });
  if (!gate.ok) return gate.res;
  const res = NextResponse.json({ ok: true });
  issueSession(res, {
    reader: true,
    // 用作者口令解锁的顺手把笔也拿到（记得勾过 remember 的话笔也是 30 天）
    author: checkPassword("author", gate.body.password),
    remember: gate.body.remember,
  });
  return res;
}

/** 合上本子 */
export async function DELETE() {
  return logoutResponse();
}
