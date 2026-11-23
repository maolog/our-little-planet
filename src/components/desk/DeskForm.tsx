"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Door, Heart, User } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useT } from "@/i18n/LocaleProvider";

type Identity = "he" | "she";

/** 隐蔽写作入口（/desk）：先选「他」或「她」，再各输各的密码。
 *  和 /lock、/write 的门分开：那边一个框收两种密码，这里先认身份再验，
 *  选错身份连密码框都不给看。成功后按服务端算好的 next 全页跳转
 *  （cookie 刚设置，客户端路由会撞 RSC 缓存） */
export function DeskForm({ demoHint }: { demoHint?: string }) {
  const t = useT();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();

  function shakeAndFocus() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !identity) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password, remember }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { next?: string };
        // 刚发完 cookie：全页跳转让服务端重新渲染，客户端路由会撞 RSC 缓存
        window.location.href = data.next && data.next.startsWith("/") ? data.next : "/";
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      // 服务端 error 已按 cookie 语言本地化；没有时用当前语言兜底
      setError(data.error ?? t("desk.error.wrong"));
      shakeAndFocus();
    } catch {
      setError(t("desk.error.network"));
    } finally {
      setBusy(false);
    }
  }

  function pick(id: Identity) {
    setIdentity(id);
    setPassword("");
    setError("");
    // 换身份后聚焦密码框（autoFocus 只在首次挂载生效）
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function backToPick() {
    if (busy) return;
    setIdentity(null);
    setPassword("");
    setError("");
  }

  const pickStep = identity === null;

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={submit} className={cn("card-paper w-full px-8 py-10 text-center", shake && "shake")}>
        <AnimatePresence mode="wait" initial={false}>
          {pickStep ? (
            <motion.div
              key="pick"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-ink-soft/60">
                <Door weight="fill" className="mx-auto size-9" />
              </p>
              <h1 className="mt-4 text-3xl font-bold">{t("desk.title")}</h1>
              <p className="mt-3 text-ink-soft">{t("desk.sub")}</p>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => pick("he")}
                  disabled={busy}
                  className="group rounded-2xl border-2 border-ink/15 bg-paper px-3 py-5 transition hover:-translate-y-0.5 hover:border-rose focus-visible:-translate-y-0.5 focus-visible:border-rose disabled:opacity-50"
                >
                  <User weight="fill" className="mx-auto size-8 text-ink-soft transition group-hover:text-rose" />
                  <span className="mt-2 block font-bold">{t("desk.pick.he")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => pick("she")}
                  disabled={busy}
                  className="group rounded-2xl border-2 border-ink/15 bg-paper px-3 py-5 transition hover:-translate-y-0.5 hover:border-rose focus-visible:-translate-y-0.5 focus-visible:border-rose disabled:opacity-50"
                >
                  <Heart weight="fill" className="mx-auto size-8 text-ink-soft transition group-hover:text-rose" />
                  <span className="mt-2 block font-bold">{t("desk.pick.she")}</span>
                </button>
              </div>
              {demoHint && (
                <p className="mt-5 rounded-full bg-butter/50 px-3 py-1.5 text-xs font-bold text-ink-soft">🌱 {demoHint}</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="password"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <p className="text-rose-deep">
                {identity === "he" ? <User weight="fill" className="mx-auto size-9" /> : <Heart weight="fill" className="mx-auto size-9" />}
              </p>
              <h1 className="mt-4 text-3xl font-bold">
                {identity === "he" ? t("desk.chosen.he") : t("desk.chosen.she")}
              </h1>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("desk.placeholder")}
                autoFocus
                autoComplete="off"
                disabled={busy}
                aria-label={t("desk.aria")}
                className={cn(
                  "mt-7 w-full rounded-2xl border-2 bg-paper px-4 py-3 text-center text-lg tracking-[0.3em] placeholder:tracking-normal placeholder:text-ink-soft/50",
                  error ? "border-rose-deep/60" : "border-ink/15 focus:border-rose"
                )}
              />
              {error && <p className="mt-3 text-sm font-bold text-rose-deep">{error}</p>}
              {/* 记住设备只有他需要：读者会话本来就一年有效 */}
              {identity === "he" && (
                <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 accent-rose-deep"
                    disabled={busy}
                  />
                  {t("desk.remember")}
                </label>
              )}
              <button type="submit" disabled={busy || password.length === 0} className="btn-primary mt-6 w-full justify-center">
                {busy ? t("desk.busy") : t("desk.cta")}
              </button>
              <button
                type="button"
                onClick={backToPick}
                disabled={busy}
                className="link-soft mt-5 text-sm text-ink-soft disabled:opacity-50"
              >
                {t("desk.back")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <Link
          href="/"
          aria-disabled={busy}
          className={cn(
            "mt-6 block w-full rounded-full border border-ink/15 px-4 py-2.5 text-sm font-bold text-ink-soft transition hover:bg-ink/5 hover:text-ink",
            busy && "pointer-events-none opacity-50"
          )}
        >
          {t("desk.guest")}
        </Link>
        <p className="mt-6 font-script text-xl text-ink-soft/60">{t("desk.psst")}</p>
      </form>
    </div>
  );
}
