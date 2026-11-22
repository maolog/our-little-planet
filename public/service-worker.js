/* 离线壳 Service Worker：只缓存静态资源（构建产物、图标、离线页），内容在线正常加载。
   - 页面导航（HTML/RSC）：网络优先，断网给离线页
   - /_next/static 等静态资源：缓存优先（文件名带内容 hash，可安全缓存）
   - /api、OSS 跨域媒体：不碰，永远走网络
   版本号变了会在 activate 时清掉旧缓存。 */
const CACHE = "opl-static-v1";
const OFFLINE_URL = "/offline.html";

// 安装时预缓存离线页与图标（manifest 跟随语言动态生成，不预缓存）
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/** 静态资源判定：构建产物 + 常见静态后缀（不含 html，页面内容不缓存） */
function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  return /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|css|js|mjs|map|webmanifest)$/.test(url.pathname);
}

/** 缓存优先：命中直接回，未命中走网络并存一份（只存 200 响应） */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // 跨域（OSS 图片/音频）与 API 不缓存：内容在线正常加载
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 页面导航：网络优先，断网回退离线壳
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response(OFFLINE_FALLBACK, { headers: { "Content-Type": "text/html; charset=utf-8" } }))
      )
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

// 兜底离线文案（预缓存丢失时用）
const OFFLINE_FALLBACK = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fff9f0;color:#5c4a42;font-family:system-ui,-apple-system,"PingFang SC",sans-serif;text-align:center}h1{font-size:18px;font-weight:600;margin:0 0 8px}p{margin:0;font-size:14px;color:#7e6557}</style></head><body><div><h1>现在是离线的</h1><p>连上网络后再来看看吧</p></div></body></html>`;
