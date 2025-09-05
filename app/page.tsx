/* app/page.tsx — working generator UI + Community feed
   - Keeps create → poll flow through /api/stylize and /api/predictions/[id]
   - 1 free guest generation (Reset free button)
   - Left: small "Original" preview, Right: large "Generated" with shimmer
   - Community section appended at the bottom
*/
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Correct path: components (NOT app/components)
const CommunityFeed = dynamic(() => import("@/components/CommunityFeed"), { ssr: true });

// --- tiny helpers ---
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const SHIMMER_CSS = `
@keyframes shimmerMove {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer {
  position: relative;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
}
.shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.07) 50%,
    rgba(255,255,255,0) 100%);
  background-size: 200% 100%;
  animation: shimmerMove 1.25s linear infinite;
  mix-blend-mode: screen;
}
`;

// A single great default that plays nicely with nano‑banana's input contract.
const DEFAULT_PROMPT =
  "single pet portrait of the exact same animal from the photo, realistic breed, markings and anatomy preserved; " +
  "fine‑art studio quality, dramatic yet elegant lighting, in a cozy environment with a tasteful background pattern, high detail, 1:1 crop";

export default function Home() {
  // generation state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [genUrl, setGenUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [freeLeft, setFreeLeft] = useState<number>(1);

  // read persisted free counter
  useEffect(() => {
    try {
      const k = localStorage.getItem("freeGenerationsLeft");
      if (k == null) localStorage.setItem("freeGenerationsLeft", "1");
      setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10) || 0);
    } catch {}
  }, []);

  // file picker
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setGenUrl("");
    if (!f) { setPreview(""); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  function resetFree() {
    try {
      localStorage.setItem("freeGenerationsLeft", "1");
      setFreeLeft(1);
    } catch {}
  }

  async function onGenerate() {
    setMsg("");
    setGenUrl("");
    if (!file) { setMsg("Pick a file first."); return; }

    // 1 free for guests
    if (freeLeft <= 0) { setMsg("Free preview used. Please sign in & buy a bundle to continue."); return; }
    try { localStorage.setItem("freeGenerationsLeft", String(Math.max(0, freeLeft - 1))); } catch {}
    setFreeLeft((n) => Math.max(0, n - 1));

    setLoading(true);
    try {
      // create
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", DEFAULT_PROMPT);

      const createRes = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await createRes.json();
      if (!createRes.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        return;
      }

      // poll
      const id: string = create.prediction_id;
      setMsg("Generating…");
      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        await new Promise((r) => setTimeout(r, 1200));
        const r2 = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const s = await r2.json();

        if (s?.status === "failed" || s?.status === "canceled") {
          setMsg(`Failed: ${s?.error || "unknown"}`);
          setLoading(false);
          return;
        }

        // unify: output can be array or string, or Replicate.urls
        let url: string | null = null;
        if (Array.isArray(s?.urls) && s.urls.length > 0) url = s.urls[0];
        else if (typeof s?.output === "string") url = s.output;
        else if (Array.isArray(s?.output) && s.output.length > 0) url = s.output[0];

        if ((s?.status === "succeeded" || s?.status === "completed") && url) {
          setGenUrl(url);
          setMsg("Done ✓");
          setLoading(false);
          return;
        }
      }

      setMsg("Timed out while polling.");
    } catch (err: any) {
      setMsg(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />

      {/* Uploader */}
      <section className="grid gap-3">
        <label className="text-sm font-medium">Upload a pet photo</label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="file"
            accept="image/*"
            onChange={onPick}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              onClick={onGenerate}
              disabled={loading || !file}
              className={cx(
                "flex-1 sm:flex-none rounded-lg bg-amber-500 px-6 py-2 font-semibold text-black",
                loading && "opacity-70 pointer-events-none"
              )}
            >
              {loading ? "Generating…" : "Generate"}
            </button>
            <button
              onClick={resetFree}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Reset free
            </button>
          </div>
        </div>
        <div className="text-xs opacity-60">Free left: {freeLeft}</div>
      </section>

      {/* Panels */}
      <section className="mt-6 grid gap-6 md:grid-cols-[360px_1fr]">
        {/* Original small */}
        <div className="rounded-2xl border border-white/10 bg-white/2 p-3">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/20">
            {preview ? (
              <img src={preview} alt="Original" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm opacity-60">
                Original
              </div>
            )}
          </div>
          <div className="mt-2 text-xs opacity-60">Original</div>
        </div>

        {/* Generated big with shimmer */}
        <div className="rounded-2xl border border-white/10 bg-white/2 p-3">
          <div
            className={cx(
              "relative aspect-[4/3] md:aspect-[3/2] rounded-xl overflow-hidden bg-black/20",
              loading && "shimmer"
            )}
          >
            {genUrl ? (
              <img src={genUrl} alt="Generated" className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm opacity-60">
                Generated
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs opacity-70">
            <div>{msg || (genUrl ? "Done ✓" : "")}</div>
            {genUrl && (
              <a
                className="rounded border border-white/15 px-2 py-1 hover:bg-white/5"
                href={genUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Community feed */}
      <div className="mt-10">
        <hr className="my-8 opacity-20" />
        <h2 className="mb-3 text-lg font-semibold">Community</h2>
        <CommunityFeed />
      </div>
    </main>
  );
}
