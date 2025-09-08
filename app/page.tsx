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
import { usePipelineSelection } from "@/components/PipelineSelector";
import type { PipelineMode } from "@/lib/pipelineConfig";

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

@keyframes confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

@keyframes heart-float {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
  100% { transform: translateY(-40px) scale(0.8); opacity: 0; }
}

@keyframes success-glow {
  0% { box-shadow: 0 0 0 0 rgba(240, 156, 32, 0.7); }
  70% { box-shadow: 0 0 0 20px rgba(240, 156, 32, 0); }
  100% { box-shadow: 0 0 0 0 rgba(240, 156, 32, 0); }
}

.confetti {
  position: fixed;
  width: 10px;
  height: 10px;
  background: var(--brand);
  animation: confetti-fall 3s linear infinite;
  z-index: 1000;
}

.heart {
  position: fixed;
  color: #ff6b6b;
  font-size: 20px;
  animation: heart-float 2s ease-out infinite;
  z-index: 1000;
  pointer-events: none;
}

.success-glow {
  animation: success-glow 1.5s ease-out;
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userUrl, setUserUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [numImages, setNumImages] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS.dog[0]?.value || "");
  const [cropRatio, setCropRatio] = useState<string>("1_1");
  const generatedRef = useRef<HTMLDivElement>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(true);
  
  // Pipeline selection
  const { selectedMode, setSelectedMode, userTier, availableOptions } = usePipelineSelection(currentUserId);

  useEffect(() => {
    
    try {
      const k = localStorage.getItem("freeGenerationsLeft");
      if (k == null) localStorage.setItem("freeGenerationsLeft", "1");
      setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10) || 0);
    } catch {}
  }, []);

  // Get user token and ID for authenticated requests
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserToken(data.session?.access_token || null);
      setCurrentUserId(data.session?.user?.id || null);
    });
    
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserToken(session?.access_token || null);
      setCurrentUserId(session?.user?.id || null);
    });
    
    return () => sub.subscription.unsubscribe();
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setGenUrl("");
    setShowSuccess(false);
    setShowUploadForm(true); // Show upload form when new file is selected
    if (!f) {
      setPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(f);
  }

  function resetForm() {
    setFile(null);
    setPreview("");
    setGenUrl("");
    setMsg("");
    setShowSuccess(false);
    setShowUploadForm(true);
    setDisplayName("");
    setUserUrl("");
  }

  async function shareImage() {
    if (!genUrl) return;
    
    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        // Fetch the image as a blob
        const response = await fetch(genUrl);
        const blob = await response.blob();
        const file = new File([blob], 'pet-portrait.jpg', { type: 'image/jpeg' });
        
        await navigator.share({
          title: 'My Pet Portrait',
          text: 'Check out this amazing pet portrait I created!',
          files: [file]
        });
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText(genUrl);
        setMsg("Image URL copied to clipboard!");
        setTimeout(() => setMsg(""), 3000);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(genUrl);
        setMsg("Image URL copied to clipboard!");
        setTimeout(() => setMsg(""), 3000);
      } catch (clipboardError) {
        setMsg("Share not supported. Right-click image to save.");
        setTimeout(() => setMsg(""), 3000);
      }
    }
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
    setShowSuccess(false);
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
    setShowUploadForm(false); // Hide upload form when generation starts
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Use selected preset for logged-in users, or DEFAULT Portrait for non-logged-in users
      const promptToUse = userToken ? (selectedPreset || PRESETS.dog[0]?.value || DEFAULT_PROMPT) : PRESETS.dog[0]?.value || DEFAULT_PROMPT;
      fd.append("prompt", promptToUse);
      
      // Add premium parameters for logged-in users
      if (userToken) {
        fd.append("num_outputs", String(numImages));
      }
      // Always send crop_ratio (available for all users)
      fd.append("crop_ratio", cropRatio);
      console.log(`[frontend] Sending crop_ratio: ${cropRatio}`);
      console.log(`[frontend] About to send request to /api/stylize-unified`);
      fd.append("user_url", userUrl);
      fd.append("display_name", displayName);
      fd.append("preset_label", PRESETS.dog.find(p => p.value === promptToUse)?.label || "");
      fd.append("user_id", currentUserId || "");

      // Include Authorization header if user is logged in
      const headers: HeadersInit = {};
      if (userToken) {
        headers.Authorization = `Bearer ${userToken}`;
      }
      
      // Add pipeline mode to form data
      fd.append("pipeline_mode", selectedMode);
      fd.append("generation_mode", "auto"); // Let the API decide based on user tier
      
      console.log(`[frontend] Sending POST request to /api/stylize-unified with pipeline: ${selectedMode}`);
      const createRes = await fetch("/api/stylize-unified", { 
        method: "POST", 
        body: fd,
        headers
      });
      console.log(`[frontend] Received response from /api/stylize-unified:`, createRes.status);
      const create = await createRes.json();
      console.log(`[frontend] Response data:`, create);
      if (!createRes.ok || !create?.output_url) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        return;
      }

      // Unified API already waits for completion, so we can use the result directly
      setGenUrl(create.output_url);
      setMsg("Done ✓");
      setShowSuccess(true); // Show success animation
      
      // Log pipeline info if available
      if (create?.pipeline_mode) {
        console.log(`[frontend] Generation completed with pipeline: ${create.pipeline_mode}`);
        console.log(`[frontend] Model used: ${create.model || 'Unknown'}`);
      }

      // Scroll to generated image
      generatedRef.current?.scrollIntoView({ behavior: 'smooth' });

      // 1) local guest history (works offline)
      try {
        pushLocal({
          output_url: create.output_url,
          input_url: create?.input_url ?? preview,
          preset_label: PRESETS.dog.find(p => p.value === promptToUse)?.label || "DEFAULT Portrait",
          created_at: new Date().toISOString(),
        });
      } catch {}

      // Note: Database insert is already handled by /api/stylize-unified route
      // No need for duplicate /api/generations call

      setLoading(false);
      
      // Hide success animation after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
      return;
    } catch (err: any) {
      setMsg(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Success animation component
  const SuccessAnimation = () => {
    if (!showSuccess) return null;
    
    return (
      <div className="fixed inset-0 pointer-events-none z-50">
        {/* Confetti */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: ['var(--brand)', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][Math.floor(Math.random() * 5)]
            }}
          />
        ))}
        
        {/* Hearts */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="heart"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
          >
            ❤️
          </div>
        ))}
        
        {/* Success message */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[var(--brand)] text-[var(--brand-ink)] px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl">
          🎉 Success! Your pet portrait is ready! 🎉
        </div>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />
      <SuccessAnimation />

      {/* Uploader - only show when showUploadForm is true */}
      {showUploadForm && (
        <section className="grid gap-4">
          <label className="text-xl font-bold text-[var(--brand)]/80 text-center">Upload a photo of your beloved pet's or transform yourself into their furry friend 𖥔 ݁ ˖</label>
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
                    className="flex items-center justify-center gap-3 w-full rounded-xl border-2 border-dashed border-[var(--brand)] bg-[var(--brand)]/5 hover:border-[var(--brand)] hover:bg-[var(--brand)]/10 transition-all duration-200 px-6 py-8 cursor-pointer group"
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
              
              {/* Style Preset - Only available for logged-in users */}
              {userToken && (
                <div className="grid gap-3">
                  <label className="text-sm font-semibold text-[var(--fg)]">Style Preset</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full rounded-xl bg-[var(--muted)] text-[var(--fg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all appearance-none cursor-pointer"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px',
                      paddingRight: '40px'
                    }}
                  >
                    {PRESETS.dog.map((preset) => (
                      <option key={preset.label} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pipeline Selection - Available for all users */}
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-[var(--fg)]">Generation Quality</label>
                <div className="space-y-2">
                  {availableOptions.options.map((option: any) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedMode === option.value
                          ? "border-[var(--brand)] bg-[var(--brand)]/10"
                          : "border-[var(--line)] hover:border-[var(--brand)]/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pipeline_mode"
                        value={option.value}
                        checked={selectedMode === option.value}
                        onChange={(e) => setSelectedMode(e.target.value as PipelineMode)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[var(--fg)]">
                            {option.label}
                          </span>
                          <span className="text-xs text-[var(--muted-fg)]">
                            {option.estimatedTime}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--muted-fg)] mt-1">
                          {option.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-[var(--muted)] text-[var(--muted-fg)] px-2 py-1 rounded">
                            {option.maxResolution}
                          </span>
                          {option.value === "multimodel" && userTier === "guest" && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Sign up required
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* User Tier Info */}
              {userTier === "guest" && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 dark:bg-gray-800/30 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <div className="text-gray-500 mt-0.5 dark:text-gray-400">ℹ️</div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        Sign up for better quality
                      </p>
                      <p className="text-xs text-gray-600 mt-1 dark:text-gray-300">
                        Logged-in users get access to high-quality generation with precise aspect ratios and upscaling.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Crop Ratio - Temporarily disabled until working properly */}
              {/* 
              <div className="grid gap-3">
                <label className="text-sm font-semibold text-[var(--fg)]">Crop Ratio</label>
                <select
                  value={cropRatio}
                  onChange={(e) => setCropRatio(e.target.value)}
                  className="w-full rounded-xl bg-[var(--muted)] text-[var(--fg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px',
                    paddingRight: '40px'
                  }}
                >
                  <option value="1_1">Square (1:1) - Instagram Square</option>
                  <option value="4_5">Portrait (4:5) - Instagram Post</option>
                  <option value="3_4">Portrait (3:4) - Classic Portrait</option>
                  <option value="2_3">Portrait (2:3) - Photo Portrait</option>
                  <option value="4_3">Landscape (4:3) - Classic Landscape</option>
                  <option value="3_2">Landscape (3:2) - Photo Landscape</option>
                  <option value="16_9">Wide (16:9) - YouTube Thumbnail</option>
                  <option value="21_9">Ultra-Wide (21:9) - Cinematic</option>
                  <option value="9_16">Vertical (9:16) - Instagram Story/TikTok</option>
                </select>
              </div>
              */}

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
      )}

      {/* Create Another button - show when form is hidden */}
      {!showUploadForm && (
        <section className="mb-6">
          <button
            onClick={resetForm}
            className="w-full rounded-xl bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-[var(--brand-ink)] px-6 py-4 font-semibold text-lg transition-all duration-200"
          >
            ✨ Create Another Portrait
          </button>
        </section>
      )}

      {/* Panels - only show after generation starts */}
      {(loading || genUrl) && (
        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Generated big with shimmer - more prominent (now on left/top) */}
        <div ref={generatedRef} className="rounded-2xl border border-[var(--line)] bg-[var(--muted)] p-4">
          <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Generated Portrait</h3>
          <div className="relative aspect-[4/3] lg:aspect-[4/3] rounded-xl overflow-hidden bg-black/20">
            {loading ? (
              <Shimmer className="h-full w-full" />
            ) : genUrl ? (
              <button
                onClick={() => setShowLightbox(true)}
                className={cx("w-full h-full group", showSuccess && "success-glow")}
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
                    onClick={shareImage}
                    className="rounded-lg border border-[var(--brand)] bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-[var(--brand-ink)] px-3 py-2 text-sm font-medium transition-all"
                  >
                    Share
                  </button>
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
                input_url: preview || null,
                display_name: displayName || null,
                website: userUrl || null,
                preset_label: PRESETS.dog.find(p => p.value === selectedPreset)?.label || null
              }]}
              initialIndex={0}
              onClose={() => setShowLightbox(false)}
            />
          )}
        </div>

        {/* Original small (now on right/bottom) */}
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
      </section>
      )}

      {/* Community feed */}
      <div className="mt-12">
        <hr className="my-8 border-[var(--line)]" />
        <h2 className="mb-6 text-xl font-bold text-[var(--fg)]">Community Gallery</h2>
        <CommunityFeed />
      </div>
    </main>
  );
}
