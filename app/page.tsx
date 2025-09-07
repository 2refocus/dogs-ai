/* app/page.tsx — working generator UI + Community feed
   - Keeps create → poll flow through /api/stylize and /api/predictions/[id]
   - 1 free guest generation (Reset free button)
   - Left: small "Original" preview, Right: large "Generated" with shimmer
   - Community section appended at the bottom
   - NEW: fire‑and‑forget POST to /api/generations to persist to Supabase (service role)
*/
"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { pushLocal } from "@/lib/localHistory";
import { supabase } from "@/lib/supabaseClient";
import { PRESETS } from "./presets";

const CommunityFeed = dynamic(() => import("@/components/CommunityFeed"), { ssr: true });
const Lightbox = dynamic(() => import("@/components/Lightbox"), { ssr: false });
const Shimmer = dynamic(() => import("@/components/Shimmer"), { ssr: false });

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
  "transform this into a single pet portrait, convert any human or other subject into a realistic dog or cat, preserve the pose and composition but change the subject to a pet animal, realistic breed, fine‑art studio quality, dramatic yet elegant lighting, in a cozy environment with a tasteful background pattern, high detail";

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
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS.dog[2]?.value || "");
  const [cropRatio, setCropRatio] = useState<string>("1:1");
  const [detectedSpecies, setDetectedSpecies] = useState<"dog" | "cat" | null>(null);
  const generatedRef = useRef<HTMLDivElement>(null);
  const [showLightbox, setShowLightbox] = useState(false);

  // Simple species detection based on file name or user input
  const detectSpecies = (fileName: string, userInput: string): "dog" | "cat" => {
    const text = (fileName + " " + userInput).toLowerCase();
    if (text.includes("cat") || text.includes("kitten") || text.includes("feline")) {
      return "cat";
    }
    if (text.includes("dog") || text.includes("puppy") || text.includes("canine")) {
      return "dog";
    }
    // Default to dog if no clear indication
    return "dog";
  };

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
      // Detect species and use appropriate preset
      const species = detectSpecies(file.name, displayName);
      setDetectedSpecies(species);
      
      // Use selected preset for logged-in users, or Cozy Home Portrait for non-logged-in users
      const presets = species === "cat" ? PRESETS.cat : PRESETS.dog;
      const promptToUse = userToken ? (selectedPreset || presets[2]?.value || DEFAULT_PROMPT) : presets[2]?.value || DEFAULT_PROMPT;
      fd.append("prompt", promptToUse);
      
      // Add premium parameters for logged-in users
      if (userToken) {
        fd.append("num_outputs", String(numImages));
        fd.append("crop_ratio", cropRatio);
      }
      fd.append("user_url", userUrl);
      fd.append("display_name", displayName);
      fd.append("preset_label", presets.find(p => p.value === promptToUse)?.label || "");

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

          // Scroll to generated image
          generatedRef.current?.scrollIntoView({ behavior: 'smooth' });

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
      <section className="grid gap-4">
        <label className="text-lg font-semibold text-[var(--fg)]">Upload a pet photo</label>
        <div className="grid gap-4">
          <div className="grid gap-4">
            <div className="grid gap-4">
              <div className="grid gap-4">
                {/* Enhanced file upload */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onPick}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed border-[var(--line)] bg-[var(--muted)] hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 transition-all duration-200 px-6 py-8 cursor-pointer group"
                  >
                    <svg className="w-8 h-8 text-[var(--brand)] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-center">
                      <div className="text-sm font-medium text-[var(--fg)]">
                        {file ? file.name : "Choose a photo"}
                      </div>
                      <div className="text-xs text-[var(--fg)]/60 mt-1">
                        {file ? "Click to change" : "Click to browse or drag and drop"}
                      </div>
                    </div>
                  </label>
                </div>
                
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your pet name (optional)"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--muted)] text-[var(--fg)] placeholder:text-[var(--fg)]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
                />
                <input
                  type="url"
                  value={userUrl}
                  onChange={(e) => setUserUrl(e.target.value)}
                  placeholder="Your website or social media URL (optional)"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--muted)] text-[var(--fg)] placeholder:text-[var(--fg)]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
                />
              </div>
              
              {/* Premium features for logged-in users */}
              {userToken && (
                <div className="grid gap-4 p-6 rounded-xl bg-[var(--muted)]/5">
                  <div className="grid gap-3">
                    <label className="text-sm font-semibold text-[var(--fg)]">Style Preset</label>
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="w-full rounded-xl bg-[var(--muted)] text-[var(--fg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
                    >
                      {(detectedSpecies === "cat" ? PRESETS.cat : PRESETS.dog).map((preset) => (
                        <option key={preset.label} value={preset.value}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3">
                    <label className="text-sm font-semibold text-[var(--fg)] opacity-50">Number of Images (1-4) - Coming Soon</label>
                    <select
                      value={numImages}
                      onChange={(e) => setNumImages(Number(e.target.value))}
                      disabled
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--muted)] text-[var(--fg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all opacity-50 cursor-not-allowed"
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "image" : "images"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-3">
                    <label className="text-sm font-semibold text-[var(--fg)] opacity-50">Crop Ratio - Coming Soon</label>
                    <select
                      value={cropRatio}
                      onChange={(e) => setCropRatio(e.target.value)}
                      disabled
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--muted)] text-[var(--fg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all opacity-50 cursor-not-allowed"
                    >
                      <option value="1:1">Square (1:1)</option>
                      <option value="4:5">Portrait (4:5)</option>
                      <option value="3:2">Landscape (3:2)</option>
                      <option value="16:9">Wide (16:9)</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={onGenerate}
                disabled={loading || !file}
                className={cx(
                  "w-full rounded-xl bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-[var(--brand-ink)] px-6 py-4 font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden",
                  loading && "animate-pulse"
                )}
              >
                {loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite] transform -skew-x-12" />
                )}
                <span className="relative z-10">
                  {loading ? "Creating your pet's portrait…" : "Generate"}
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center text-sm text-[var(--fg)]/70 font-medium">
          <span>Free generations left: {freeLeft}</span>
          <button
            onClick={resetFree}
            className="text-sm text-[var(--fg)]/70 hover:text-[var(--fg)] transition-colors"
          >
            Reset free
          </button>
        </div>
      </section>

      {/* Panels */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Original small */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--muted)] p-4">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Original</h3>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-black/20">
            {preview ? (
              <img src={preview} alt="Original" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-[var(--fg)]/60">
                No image selected
              </div>
            )}
          </div>
        </div>

        {/* Generated big with shimmer - more prominent */}
        <div ref={generatedRef} className="rounded-2xl border border-[var(--line)] bg-[var(--muted)] p-4">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Generated Portrait</h3>
          <div className="relative aspect-[4/3] lg:aspect-[4/3] rounded-xl overflow-hidden bg-black/20">
            {loading ? (
              <Shimmer className="h-full w-full" />
            ) : genUrl ? (
              <button
                onClick={() => setShowLightbox(true)}
                className="w-full h-full group"
              >
                <img src={genUrl} alt="Generated" className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300" />
              </button>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-[var(--fg)]/60">
                Generated image will appear here
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium text-[var(--fg)]">
              {msg || (genUrl ? "✓ Generation complete" : "")}
            </div>
            <div className="flex gap-2">
              {genUrl && (
                <>
                  <button
                    onClick={() => setShowLightbox(true)}
                    className="rounded-lg border border-[var(--line)] bg-[var(--muted)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-3 py-2 text-sm font-medium transition-all"
                  >
                    View
                  </button>
                  <a
                    className="rounded-lg border border-[var(--line)] bg-[var(--muted)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-3 py-2 text-sm font-medium transition-all"
                    href={genUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Lightbox */}
          {showLightbox && genUrl && (
            <Lightbox
              images={[{
                id: Date.now(),
                output_url: genUrl,
                display_name: displayName || null,
                website: userUrl || null,
                preset_label: (detectedSpecies === "cat" ? PRESETS.cat : PRESETS.dog).find(p => p.value === selectedPreset)?.label || null
              }]}
              initialIndex={0}
              onClose={() => setShowLightbox(false)}
            />
          )}
        </div>
      </section>

      {/* Community feed */}
      <div className="mt-12">
        <hr className="my-8 border-[var(--line)]" />
        <h2 className="mb-6 text-xl font-bold text-[var(--fg)]">Community Gallery</h2>
        <CommunityFeed />
      </div>
    </main>
  );
}
