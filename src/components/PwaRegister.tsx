"use client";

import { useEffect } from "react";

/** 注册离线壳 Service Worker（只在生产构建注册：dev 下缓存会干扰热更新）。
 *  SW 只缓存静态资源与离线页，内容请求照常走网络；注册失败静默忽略。 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      /* HTTP 或不支持的环境，忽略 */
    });
  }, []);
  return null;
}
