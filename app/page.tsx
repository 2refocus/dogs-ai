/* app/page.tsx — Single-nav UI, big result panel, working create→poll logic.
   - Keeps your existing /api/stylize + /api/predictions/[id] flow
   - 1 free guest generation (reset with button)
   - Upload button centered + full width on small screens
   - Left: small Original preview, Right: large Generated with shimmer
*/
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

// ---------- Small helpers ----------
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const shimmerCss = `
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
    rgba(255,255,255,0.06) 50%,
    rgba(255,255,255,0) 100%);
  background-size: 200% 100%;
  animation: shimmerMove 1.4s linear infinite;
  mix-blend-mode: screen;
}
`;

// ---------- Component ----------
export default function Home() {
  // generation state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [genUrl, setGenUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [freeLeft, setFreeLeft] = useState<number>(1);

  // ensure 1 free generation persisted
  useEffect(() => {
    try {
      const k = localStorage.getItem("freeGenerationsLeft");
      if (k == null) localStorage.setItem("freeGenerationsLeft", "1");
      setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10) || 0);
    } catch {}
  }, []);

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setGenUrl("");
    if (!f) { setPreview(""); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

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

    // free credit handling
    let canProceed = false;
    const left = Math.max(0, freeLeft - 1);
    if (freeLeft > 0) {
      try { localStorage.setItem("freeGenerationsLeft", String(left)); } catch {}
      setFreeLeft(left);
      canProceed = true;
    } else {
      // (keep it simple: require login/credits outside of this demo scope)
      setMsg("Free preview used. Please sign in & buy a bundle to continue.");
      return;
    }

    if (!canProceed) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", DEFAULT_PROMPT); // fixed beautiful style

      // Step 1: create prediction
      const r = await fetch("/api/stylize", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok || !j?.prediction_id) {
        setMsg(j?.error || "Create failed");
        setLoading(false);
        return;
      }

      // Step 2: poll status
      const id: string = j.prediction_id;
      setMsg("Generating…");
      const t0 = Date.now();
      while (Date.now() - t0 < 120_000) { // 2 mins
        await new Promise((res) => setTimeout(res, 1200));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const s = await g.json();

        if (s?.status === "failed" || s?.status === "canceled") {
          setMsg(`Failed: ${s?.error || "unknown"}`);
          setLoading(false);
          return;
        }

        // unify different shapes: {urls:[...]} or {output:""} or {output:[...]}
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

        // keep waiting
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
      {/* inject shimmer CSS once */}
      <style dangerouslySetInnerHTML={{ __html: shimmerCss }} />

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
        {/* original small */}
        <div className="rounded-2xl border border-white/10 bg-white/2 p-3">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/20">
            {preview ? (
              <img src={preview} alt="Original" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm opacity-60">Original</div>
            )}
          </div>
          <div className="mt-2 text-xs opacity-60">Original</div>
        </div>

        {/* generated big with shimmer */}
        <div className="rounded-2xl border border-white/10 bg-white/2 p-3">
          <div className={cx(
            "relative aspect-[4/3] md:aspect-[3/2] rounded-xl overflow-hidden bg-black/20",
            loading && "shimmer"
          )}>
            {genUrl ? (
              <img src={genUrl} alt="Generated" className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm opacity-60">Generated</div>
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

    {/*}  <footer className="mt-10 flex items-center justify-between text-xs opacity-60">
        <div>Made with ❤️</div>
        <div>build: ui</div>
      </footer>*/}
    </main>
  );
}

// A single great default that plays nicely with nano‑banana's input contract.
const DEFAULT_PROMPT =
  "single pet portrait of the exact same animal from the photo, realistic breed, markings and anatomy preserved; " +
  "fine‑art studio quality, dramatic yet elegant lighting, in a cozy enviroment with a beautiful backgroudn pattern, high detail, 1:1 crop";
