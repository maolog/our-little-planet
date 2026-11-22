// 从 src/app/icon.svg 生成 PWA 图标：npm run gen-pwa-icons
// 输出：public/icon-192.png、public/icon-512.png、public/icon-maskable-512.png、src/app/apple-icon.png
// 幂等：每次全量覆盖，改了源 SVG 重跑即可。
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "src/app/icon.svg");

// icon.svg 的爱心路径（viewBox 0 0 64 64），供 maskable / apple 变体重绘
const HEART_D =
  "M32 50c-10-7-18-13.4-18-21.2 0-6 4.6-10.8 10.4-10.8 3 0 5.8 1.4 7.6 3.8 1.8-2.4 4.6-3.8 7.6-3.8C45.4 18.2 50 23 50 28.8 50 36.6 42 43 32 50z";

// maskable：背景铺满全幅（无圆角，系统自己裁），内容缩到安全区（中心 80%）
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FFF9F0"/>
  <g transform="translate(32 32) scale(0.68) translate(-32 -32)">
    <path d="${HEART_D}" fill="#E48BA8"/>
  </g>
</svg>`;

// apple-icon：方形背景（iOS 主屏自己加圆角遮罩）
const APPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#FFF9F0"/>
  <path d="${HEART_D}" fill="#E48BA8"/>
</svg>`;

const source = await readFile(SOURCE);

async function render(input, size, outFile, density = 600) {
  await sharp(input, { density }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(ROOT, outFile));
  console.log(`✓ ${outFile} (${size}x${size})`);
}

// 普通图标：沿用源 SVG 自带的圆角矩形背景
await render(source, 192, "public/icon-192.png");
await render(source, 512, "public/icon-512.png");
// maskable / apple：全幅背景变体
await render(Buffer.from(MASKABLE_SVG), 512, "public/icon-maskable-512.png");
await render(Buffer.from(APPLE_SVG), 180, "src/app/apple-icon.png");

console.log("PWA icons done.");
