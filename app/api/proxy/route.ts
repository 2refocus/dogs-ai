
import { NextRequest } from "next/server";
import { Buffer } from "node:buffer";

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
  const wParam = searchParams.get("w");
  const w = wParam ? parseInt(wParam, 10) : 0;
  if (!url) return new Response("Missing url", { status: 400 });

  // Data URLs: return directly
  if (url.startsWith("data:")) {
    const buf = dataUrlToBuffer(url);
    if (!buf) return new Response("Bad data URL", { status: 400 });
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(buf.length),
        "content-disposition": `inline; filename="portrait.jpg"`
      }
    });
  }

  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) {
      const txt = await upstream.text().catch(() => "");
      return new Response(txt || "Upstream error", { status: upstream.status });
    }

    const arrayBuf = await upstream.arrayBuffer();
    let buf: Buffer = Buffer.from(arrayBuf as ArrayBuffer);
    const ct = upstream.headers.get("content-type") || "image/jpeg";
    const name = filenameFromUrl(url);

    if (w && w > 0 && w <= 1024) {
      try {
        const sharp = (await import("sharp")).default;
        const resized: Buffer = await sharp(buf).resize({ width: w, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
        return new Response(new Uint8Array(resized), {
          status: 200,
          headers: {
            "content-type": "image/jpeg",
            "content-length": String(resized.length),
            "cache-control": "public, max-age=31536000, immutable",
            "content-disposition": `inline; filename="${name || "portrait"}-${w}.jpg"`
          }
        });
      } catch {
        // sharp unavailable -> fall through with original buffer
      }
    }

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "content-type": ct,
        "content-length": String(buf.length),
        "content-disposition": `inline; filename="${name || "portrait"}.jpg"`,
        "cache-control": "public, max-age=31536000, immutable"
      }
    });
  } catch (e: any) {
    return new Response(e?.message || "Proxy failed", { status: 500 });
  }
}
