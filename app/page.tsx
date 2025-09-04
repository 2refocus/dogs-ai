/* app/page.tsx — inline SVG placeholder (no public file needed) */
"use client";

import { useState, useEffect } from "react";

function SvgPlaceholder() {
  return (
    <svg
      viewBox="0 0 512 512"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      role="img"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#202225" />
          <stop offset="1" stopColor="#2a2d31" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="512" height="512" fill="url(#g)" />
      <rect x="64" y="80" width="384" height="272" rx="12" fill="#33373c" />
      <circle cx="164" cy="168" r="32" fill="#3b4046" />
      <path d="M96 320l88-72 64 48 88-80 80 104H96z" fill="#454a51" />
      <g fill="#50565f" transform="translate(168,360)">
        <ellipse cx="24" cy="28" rx="20" ry="16" />
        <circle cx="0" cy="0" r="10" />
        <circle cx="24" cy="-6" r="10" />
        <circle cx="48" cy="0" r="10" />
        <circle cx="24" cy="16" r="10" />
      </g>
    </svg>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResultUrl("");
    setMsg("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl("");
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
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", "Elegant fine-art pet portrait, warm light, 1:1 crop");

      const r = await fetch("/api/stylize", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.prediction_id) {
        setMsg(j?.error || "Create failed");
        setLoading(false);
        return;
      }

      const id = String(j.prediction_id);
      setMsg("Generating…");

      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        await new Promise((res) => setTimeout(res, 1200));
        const pr = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const pj = await pr.json();

        const urls: string[] = Array.isArray(pj.urls) ? pj.urls : [];
        const outArr: string[] = Array.isArray(pj.output) ? pj.output : [];
        const outStr: string | null =
          typeof pj.output === "string" ? pj.output : null;
        const normalized = urls[0] ?? outArr[0] ?? outStr ?? null;

        if (pj.status === "succeeded" || pj.status === "completed") {
          if (!normalized) setMsg("Done, but no output URL returned.");
          else setResultUrl(normalized);
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

      <div className="relative w-full aspect-square rounded border border-neutral-700 bg-neutral-900 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-neutral-800/40 pointer-events-none" />
        )}

        {resultUrl ? (
          <img
            src={resultUrl}
            alt="result"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt="preview"
            className={\`absolute inset-0 h-full w-full object-cover \${loading ? "opacity-70" : ""}\`}
          />
        ) : (
          <SvgPlaceholder />
        )}
      </div>

      <div className="text-sm opacity-80">{msg}</div>
    </main>
  );
}
