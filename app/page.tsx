/* app/page.tsx — minimal client with placeholder + shimmer + robust polling */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Simple inline SVG placeholder (1:1) */
function Placeholder() {
  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="placeholder"
      className="w-full h-full block bg-[#111] text-[#444]"
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1b1b1b" />
          <stop offset="50%" stopColor="#222" />
          <stop offset="100%" stopColor="#1b1b1b" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="400" fill="url(#g)" />
      <g fill="none" stroke="#333" strokeWidth="2">
        <rect x="40" y="40" width="320" height="320" rx="8" />
        <path d="M80 280 L150 210 L210 260 L270 200 L320 260" />
        <circle cx="150" cy="170" r="24" />
      </g>
    </svg>
  );
}

/** Light shimmer overlay shown while loading */
function Shimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-md">
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // Build a FileReader preview for the uploaded image
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const rd = new FileReader();
    rd.onload = () => setPreview(String(rd.result || ""));
    rd.readAsDataURL(file);
    return () => rd.abort();
  }, [file]);

  async function onSubmit() {
    setMsg("Starting…");
    setImg("");
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", "Elegant fine‑art pet portrait, warm light");

      const res = await fetch("/api/stylize", { method: "POST", body: fd, signal });
      const create = await res.json();
      if (!res.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        return;
      }

      setMsg("Created. Polling…");
      const id = create.prediction_id as string;

      const t0 = Date.now();
      while (!signal.aborted && Date.now() - t0 < 120000) {
        await new Promise((r) => setTimeout(r, 1200));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store", signal });
        const j = await g.json();

        if (!g.ok) {
          setMsg(j?.error || "Poll failed");
          setLoading(false);
          return;
        }

        // extract any output url shape
        let url: string | null = null;
        if (Array.isArray(j.urls) && j.urls.length > 0) url = j.urls[0];
        else if (Array.isArray(j.output) && j.output.length > 0) url = j.output[0];
        else if (typeof j.output === "string" && j.output) url = j.output;

        if (j.status === "succeeded" || j.status === "completed") {
          if (!url) {
            setMsg("Done but no output URL");
            setLoading(false);
            return;
          }
          setImg(url);
          setMsg("Done ✔");
          setLoading(false);
          return;
        }
        if (j.status === "failed" || j.status === "canceled") {
          setMsg(`Failed: ${j.error || "unknown error"}`);
          setLoading(false);
          return;
        }

        // optional: show progressive preview url if available
        if (url) setImg(url);
      }

      if (!signal.aborted) {
        setMsg("Timed out while polling.");
        setLoading(false);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setMsg(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 grid gap-5">
      <div className="grid gap-3">
        <label className="text-sm font-medium">Upload a pet photo</label>
        <input
          className="input"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={onSubmit}
          disabled={!file || loading}
          className={`btn-primary h-11 ${loading ? "opacity-80" : ""}`}
        >
          {loading ? "Generating…" : "Generate portrait"}
        </button>
      </div>

      <div className="grid gap-2">
        <div className="relative w-full aspect-square rounded-md overflow-hidden bg-black/80">
          {/* placeholder (shows until there is a preview or result) */}
          {!preview && !img && <Placeholder />}

          {/* uploaded preview while waiting */}
          {preview && !img && (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          )}

          {/* final or progressive result */}
          {img && <img src={img} alt="result" className="w-full h-full object-cover" />}

          {loading && <Shimmer />}
        </div>
        <div className="text-sm opacity-80">{msg}</div>
      </div>
    </main>
  );
}
