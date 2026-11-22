/** 口令端点的失败限流：进程内计数，单机部署（pm2 单实例 / Docker 单容器）够用。
 *  连续失败满 MAX_FAILS 次 → 冷却 LOCK_MS 毫秒内一律拒绝，挡住暴力试探。
 *  成功一次即清零，不会误伤忘了密码多试几次的真人。 */

type Bucket = { fails: number; lastFailAt: number; lockedUntil: number };

const MAX_FAILS = 10;
const LOCK_MS = 10 * 60_000;
const FAIL_WINDOW_MS = 15 * 60_000; // 距上次失败超过这个窗口，计数从头来

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  // 正常规模不动它；只在桶数失控时清理过期项，避免 Map 无限涨
  if (buckets.size < 512) return;
  for (const [key, b] of buckets) {
    if (b.lockedUntil <= now && now - b.lastFailAt > FAIL_WINDOW_MS) buckets.delete(key);
  }
}

/** 是否正处于冷却期（true = 应当直接拒绝本次请求） */
export function rateLimited(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b) return false;
  if (b.lockedUntil > now) return true;
  if (now - b.lastFailAt > FAIL_WINDOW_MS) buckets.delete(key); // 窗口过了，重新计数
  return false;
}

/** 记一次失败；满阈值则开始冷却 */
export function rateLimitFail(key: string): void {
  const now = Date.now();
  prune(now);
  const b = buckets.get(key) ?? { fails: 0, lastFailAt: 0, lockedUntil: 0 };
  b.fails = now - b.lastFailAt > FAIL_WINDOW_MS ? 1 : b.fails + 1;
  b.lastFailAt = now;
  if (b.fails >= MAX_FAILS) b.lockedUntil = now + LOCK_MS;
  buckets.set(key, b);
}

/** 校验通过：清掉这个 key 的失败记录 */
export function rateLimitOk(key: string): void {
  buckets.delete(key);
}

/** 客户端 IP：优先反代（Nginx）传的 X-Forwarded-For，没有就退回本机标识 */
export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "local";
}
