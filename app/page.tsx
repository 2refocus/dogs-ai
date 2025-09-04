/* app/page.tsx — clean, square preview + shimmer + no client Supabase write */
"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // pick file + show instant preview
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResultUrl("");
    setMsg("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl("");
    }
  }

  async function onSubmit() {
    setMsg("");
    setResultUrl("");
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }
    setLoading(true);

    try {
      // 1) create prediction
      const fd = new FormData();
      fd.append("file", file);
      // Simple, good default prompt (1:1 crop; model decides style)
      fd.append(
        "prompt",
        "Elegant fine-art pet portrait, warm light, 1:1 crop",
      );

      const r = await fetch("/api/stylize", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.prediction_id) {
        setMsg(j?.error || "Create failed");
        setLoading(false);
        return;
      }

      // 2) poll prediction
      const id = String(j.prediction_id);
      setMsg("Generating…");

      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        await new Promise((res) => setTimeout(res, 1200));
        const pr = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const pj = await pr.json();

        // normalize potential shapes
        const urls: string[] = Array.isArray(pj.urls) ? pj.urls : [];
        const outArr: string[] = Array.isArray(pj.output) ? pj.output : [];
        const outStr: string | null =
          typeof pj.output === "string" ? pj.output : null;
        const url = urls[0] ?? outArr[0] ?? outStr ?? null;

        if (pj.status === "succeeded" || pj.status === "completed") {
          if (!url) {
            setMsg("Done, but no output URL returned.");
          } else {
            setResultUrl(url);
            setMsg("Done ✔");
          }
          setLoading(false);
          return;
        }
        if (pj.status === "failed" || pj.status === "canceled") {
          setMsg(`Failed: ${pj.error || "unknown error"}`);
          setLoading(false);
          return;
        }
      }

      setMsg("Timed out while polling.");
    } catch (e: any) {
      setMsg(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 grid gap-5">
      {/* Top controls */}
      <div className="grid gap-3">
        <label className="text-sm font-medium">Upload a pet photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={onPick}
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
        />
        <button
          onClick={onSubmit}
          disabled={loading || !file}
          className="rounded bg-amber-500 px-4 py-2 font-medium text-black disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate portrait"}
        </button>
      </div>

      {/* Image stage */}
      <div className="relative w-full aspect-square rounded border border-neutral-700 bg-neutral-900 overflow-hidden">
        {/* shimmer overlay while generating */}
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-neutral-800/40 pointer-events-none" />
        )}

        {/* Result has priority */}
        {resultUrl ? (
          <img
            src={resultUrl}
            alt="result"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : previewUrl ? (
          // show the picked photo until result arrives
          <img
            src={previewUrl}
            alt="preview"
            className={`absolute inset-0 h-full w-full object-cover ${
              loading ? "opacity-70" : ""
            }`}
          />
        ) : (
          // fallback placeholder (add public/placeholder.jpg to your repo)
          <img
            src="/placeholder.jpg"
            alt="placeholder"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
        )}
      </div>

      {/* Message line */}
      <div className="text-sm opacity-80">{msg}</div>
    </main>
  );
}
