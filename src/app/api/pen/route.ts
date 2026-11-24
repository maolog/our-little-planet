import { NextResponse } from "next/server";
import { checkPassword } from "@/lib/auth";
import { issueSession, passwordGate } from "@/lib/loginGate";

/** 拿起笔：作者口令，拿到写手账的权限（同时也算解开本子）。
 *  笔是限时的：默认 AUTHOR_SESSION_HOURS 小时后收回，勾了 remember 才 30 天 */
export async function POST(req: Request) {
  const gate = await passwordGate(req, {
    verify: (b) => checkPassword("author", b.password),
    failMsg: "这不是作者的口令哦",
  });
  if (!gate.ok) return gate.res;
  const res = NextResponse.json({ ok: true });
  // 拿笔必然能读：读者会话一起发
  issueSession(res, { reader: true, author: true, remember: gate.body.remember });
  return res;
}
