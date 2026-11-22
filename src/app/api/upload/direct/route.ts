import { NextResponse } from "next/server";
import { isReader } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, isAcceptedFile, normalizeMime, saveLocalDirect } from "@/lib/media";
import { storageMode } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 上传第二步（仅本地模式）：浏览器 PUT 文件体到服务器落盘。
 *  请求流一边收一边写（带背压），大视频不再整包读进内存。
 *  OSS 模式不走这里（直传 OSS），配置了 OSS 时此端点直接拒绝 */
export async function PUT(req: Request) {
  if (storageMode() === "oss") {
    return NextResponse.json({ error: "OSS 模式下请直传 OSS" }, { status: 400 });
  }
  if (!(await isReader())) {
    return NextResponse.json({ error: "先解锁本子" }, { status: 401 });
  }
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId") ?? "";
  const mime = url.searchParams.get("mime") ?? "";
  const name = url.searchParams.get("name") ?? "";
  if (!/^[a-f0-9]{8,16}$/.test(mediaId)) {
    return NextResponse.json({ error: "mediaId 不合法" }, { status: 400 });
  }
  // 与 /api/upload/prepare 同一套校验：不接受的类型直接拒（不落盘）
  const normalized = normalizeMime(mime, name);
  if (!isAcceptedFile(normalized, name)) {
    return NextResponse.json({ error: `「${name || "文件"}」不是支持的照片或视频格式` }, { status: 415 });
  }
  const contentLength = Number(req.headers.get("content-length"));
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "文件太大" }, { status: 413 });
  }
  if (!req.body) {
    return NextResponse.json({ error: "请求体是空的" }, { status: 400 });
  }
  try {
    const { filename } = await saveLocalDirect(mediaId, normalized, name, req.body);
    return NextResponse.json({ ok: true, key: `media/${filename}` });
  } catch (e) {
    if (e instanceof Error && e.message === "UPLOAD_TOO_LARGE") {
      return NextResponse.json({ error: "文件太大" }, { status: 413 });
    }
    if (e instanceof Error && e.message === "UPLOAD_EMPTY") {
      return NextResponse.json({ error: "请求体是空的" }, { status: 400 });
    }
    return NextResponse.json({ error: "保存上传文件失败" }, { status: 500 });
  }
}
