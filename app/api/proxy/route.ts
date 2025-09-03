import { NextRequest } from "next/server";

export const runtime = "nodejs";

function filenameFromUrl(url: string) {
  try {
    const u = new URL(url);
    const name = u.pathname.split("/").filter(Boolean).pop() || "image";
    return decodeURIComponent(name);
  } catch {
    return "image";
  }
}

function dataUrlToBuffer(dataUrl: string) {
  const m = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!m) return null;
  const base64 = m[2];
  return Buffer.from(base64, "base64");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  // Handle data URLs directly
  if (url.startsWith("data:")) {
    const buf = dataUrlToBuffer(url);
    if (!buf) return new Response("Bad data URL", { status: 400 });
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(buf.length),
        "content-disposition": `attachment; filename="portrait.jpg"`
      }
    });
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return new Response(txt || "Upstream error", { status: res.status });
    }
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const ct = res.headers.get("content-type") || "application/octet-stream";
    const name = filenameFromUrl(url);
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": ct,
        "content-length": String(buf.length),
        "content-disposition": `attachment; filename="${name || "portrait"}.jpg"`,
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch (e: any) {
    return new Response(e?.message || "Proxy failed", { status: 500 });
  }
}
