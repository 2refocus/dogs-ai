/* app/page.tsx — working generator UI + Community feed
   - Keeps create → poll flow through /api/stylize and /api/predictions/[id]
   - 1 free guest generation (Reset free button)
   - Left: small "Original" preview, Right: large "Generated" with shimmer
   - Community section appended at the bottom
   - NEW: fire‑and‑forget POST to /api/generations to persist to Supabase (service role)
*/
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { pushLocal } from "@/lib/localHistory";
import { supabase } from "@/lib/supabaseClient";
import { PRESETS } from "./presets";

const CommunityFeed = dynamic(() => import("@/components/CommunityFeed"), { ssr: true });

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

const DEFAULT_PROMPT =
  "single pet portrait of the exact same animal from the photo, realistic breed, markings and anatomy preserved; " +
  "fine‑art studio quality, dramatic yet elegant lighting, in a cozy environment with a tasteful background pattern, high detail, 1:1 crop";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [genUrl, setGenUrl] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [freeLeft, setFreeLeft] = useState<number>(1);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userUrl, setUserUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [numImages, setNumImages] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [cropRatio, setCropRatio] = useState<string>("1:1");
  const [detailLevel, setDetailLevel] = useState<number>(50);

  useEffect(() => {
    try {
      const k = localStorage.getItem("freeGenerationsLeft");
      if (k == null) localStorage.setItem("freeGenerationsLeft", "1");
      setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10) || 0);
    } catch {}
  }, []);

  // Get user token for authenticated requests
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserToken(data.session?.access_token || null);
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserToken(session?.access_token || null);
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setGenUrl("");
    if (!f) {
      setPreview("");
      return;
    }
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
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }

    if (freeLeft <= 0) {
      setMsg("Free preview used. Please sign in & buy a bundle to continue.");
      return;
    }
    try {
      localStorage.setItem("freeGenerationsLeft", String(Math.max(0, freeLeft - 1)));
    } catch {}
    setFreeLeft((n) => Math.max(0, n - 1));

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Use selected preset or default prompt
      fd.append("prompt", selectedPreset || DEFAULT_PROMPT);
      
      // Add premium parameters for logged-in users
      if (userToken) {
        fd.append("num_outputs", String(numImages));
        fd.append("crop_ratio", cropRatio);
        fd.append("detail_level", String(detailLevel));
      }
      fd.append("user_url", userUrl);
      fd.append("display_name", displayName);

      // Include Authorization header if user is logged in
      const headers: HeadersInit = {};
      if (userToken) {
        headers.Authorization = `Bearer ${userToken}`;
      }
      
      const createRes = await fetch("/api/stylize", { 
        method: "POST", 
        body: fd,
        headers
      });
      const create = await createRes.json();
      if (!createRes.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        return;
      }

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

        let url: string | null = null;
        if (Array.isArray(s?.urls) && s.urls.length > 0) url = s.urls[0];
        else if (typeof s?.output === "string") url = s.output;
        else if (Array.isArray(s?.output) && s.output.length > 0) url = s.output[0];

        if ((s?.status === "succeeded" || s?.status === "completed") && url) {
          setGenUrl(url);
          setMsg("Done ✓");

          // 1) local guest history (works offline)
          try {
            pushLocal({
              output_url: url,
              input_url: create?.input_url ?? null,
              created_at: new Date().toISOString(),
            });
          } catch {}

          // Note: Database insert is already handled by /api/stylize route
          // No need for duplicate /api/generations call

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
          <div className="grid gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={onPick}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            />
            <input
              type="url"
              value={userUrl}
              onChange={(e) => setUserUrl(e.target.value)}
              placeholder="Your website or social media URL (optional)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            />
            
            {/* Premium features for logged-in users */}
            {userToken && (
              <div className="grid gap-4 mt-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Style Preset</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <option value="">Default Style</option>
                    {PRESETS.dog.map((preset) => (
                      <option key={preset.label} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Number of Images (1-4)</label>
                  <select
                    value={numImages}
                    onChange={(e) => setNumImages(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "image" : "images"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Crop Ratio</label>
                  <select
                    value={cropRatio}
                    onChange={(e) => setCropRatio(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="4:5">Portrait (4:5)</option>
                    <option value="3:2">Landscape (3:2)</option>
                    <option value="16:9">Wide (16:9)</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">Detail Level</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={detailLevel}
                    onChange={(e) => setDetailLevel(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs opacity-60 text-center">
                    {detailLevel < 30 ? "Artistic" : detailLevel < 70 ? "Balanced" : "Ultra-detailed"}
                  </div>
                </div>
              </div>
            )}
          </div>
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
