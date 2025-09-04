/* app/page.tsx — minimal client change to poll predictions endpoint */
"use client";
import { useState } from "react";

type PredStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "completed"
  | "failed"
  | "canceled";

function extractOutputUrl(j: any): string | null {
  // 1) Our normalized field from /api/predictions
  if (
    Array.isArray(j?.urls) &&
    j.urls.length > 0 &&
    typeof j.urls[0] === "string"
  ) {
    return j.urls[0];
  }

  // 2) Common Replicate shapes
  const out = j?.output;

  // array of urls
  if (Array.isArray(out) && out.length > 0 && typeof out[0] === "string") {
    return out[0];
  }

  // single string url
  if (typeof out === "string" && /^https?:\/\//i.test(out)) {
    return out;
  }

  // object with common keys
  if (out && typeof out === "object") {
    if (typeof out.image === "string" && /^https?:\/\//i.test(out.image))
      return out.image;
    if (
      Array.isArray(out.images) &&
      out.images.length > 0 &&
      typeof out.images[0] === "string"
    ) {
      return out.images[0];
    }
    // last-resort: scan values for first URL-looking string
    for (const v of Object.values(out)) {
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
      if (
        Array.isArray(v) &&
        v.length > 0 &&
        typeof v[0] === "string" &&
        /^https?:\/\//i.test(v[0])
      ) {
        return v[0];
      }
    }
  }

  return null;
}

export default function HomeMinimalPoller() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("");

  async function onSubmit() {
    setMsg("Starting…");
    setImg("");
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }

    try {
      // kick off job
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "prompt",
        "Elegant fine-art pet portrait, warm light, 1:1 crop",
      );

      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await res.json().catch(() => ({}));
      if (!res.ok || !create?.prediction_id) {
        setMsg(create?.error || `Create failed (${res.status})`);
        return;
      }

      setMsg("Created. Polling…");
      const id: string = create.prediction_id;

      // poll up to 2 min (client side)
      const t0 = Date.now();
      while (Date.now() - t0 < 120_000) {
        await new Promise((r) => setTimeout(r, 1200));

        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const j = await g.json().catch(() => ({}));

        if (!g.ok) {
          setMsg(j?.error || `Poll failed (${g.status})`);
          return;
        }

        const status: PredStatus = j?.status;
        if (status === "failed" || status === "canceled") {
          setMsg(`Failed: ${j?.error || "unknown error"}`);
          return;
        }

        if (status === "succeeded" || status === "completed") {
          const url = extractOutputUrl(j);
          if (!url) {
            setMsg("Done, but no output URL returned.");
            return;
          }
          setImg(url);
          setMsg("Done ✔");
          return;
        }

        // otherwise keep waiting (starting / processing)
        setMsg(`Polling… (${status || "processing"})`);
      }

      setMsg("Timed out while polling.");
    } catch (e: any) {
      setMsg(e?.message || "Unexpected error");
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 grid gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={onSubmit} className="border p-2 rounded">
        Generate
      </button>
      <div>{msg}</div>
      {img && <img src={img} alt="result" />}
    </main>
  );
}
