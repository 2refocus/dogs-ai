"use client";

import { useEffect, useMemo, useState } from "react";
import { PRESETS, type Species, type Preset } from "@/app/presets";
import { supabase } from "@/lib/supabaseClient";
import { pushLocal } from "@/lib/localHistory";
import ProgressiveImage from "@/components/ProgressiveImage";

export const dynamic = "force-dynamic";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

type SubjectMode = Species | "auto";

const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";

/** Flat id -> label index, future-proof if you later store only preset_id */
const PRESET_LOOKUP: Record<string, string> = (() => {
  const arr: any[] = Array.isArray(PRESETS)
    ? PRESETS
    : Object.values(PRESETS).flat();
  return arr.reduce((acc: Record<string, string>, p: any) => {
    if (p && typeof p.id === "string" && typeof p.label === "string") {
      acc[p.id] = p.label;
    }
    return acc;
  }, {});
})();

export default function Home() {
  const [subject, setSubject] = useState<SubjectMode>("auto");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState<number>(1);
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  // Merge dog+cat when in "auto", dedupe by label to avoid dupes
  const mergedPresets = useMemo(() => {
    const seen = new Set<string>();
    const res: Preset[] = [];
    [...PRESETS.dog, ...PRESETS.cat].forEach((p) => {
      if (!seen.has(p.label)) {
        seen.add(p.label);
        res.push(p);
      }
    });
    return res;
  }, []);

  const presets = useMemo(() => {
    if (subject === "dog") return PRESETS.dog;
    if (subject === "cat") return PRESETS.cat;
    return mergedPresets;
  }, [subject, mergedPresets]);

  const presetLabel = presets[presetIdx]?.label || "Custom";

  // Seed prompt from preset selection and subject toggle
  useEffect(() => {
    let base = presets[presetIdx]?.value || "";
    if (subject === "auto") {
      base = base
        .replace(/\bdog(s)?\b/gi, "pet$1")
        .replace(/\bcat(s)?\b/gi, "pet$1");
    }
    setPrompt(base);
  }, [presetIdx, subject, presets]);

  // Free-trial counter + auth state
  useEffect(() => {
    try {
      const key = localStorage.getItem("freeGenerationsLeft");
      if (key === null) localStorage.setItem("freeGenerationsLeft", "1");
      setFreeLeft(
        parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10),
      );
    } catch {}
    supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSignedIn(Boolean(s)),
    );
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // File -> preview
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult(null);
    setError(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  // Ensure prompt references the correct “subject” when user picks Auto
  const buildPrompt = () => {
    if (subject === "auto") {
      let p = prompt;
      p = p.replace(/\bdog(s)?\b/gi, "pet$1").replace(/\bcat(s)?\b/gi, "pet$1");
      return p;
    }
    if (!/\bdog|cat\b/i.test(prompt)) {
      return `${prompt} ${subject === "dog" ? "portrait of a dog" : "portrait of a cat"}`.trim();
    }
    return prompt;
  };

  const onSubmit = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setPercent(1);
    setShowPanel(true);

    const timer = window.setInterval(() => {
      setPercent((p) =>
        p < 87 ? p + Math.max(1, Math.round((87 - p) / 8)) : p,
      );
    }, 300);

    try {
      let token: string | null = null;
      let canProceed = false;

      // Free: burn local counter
      if (freeLeft > 0) {
        const left = Math.max(0, freeLeft - 1);
        localStorage.setItem("freeGenerationsLeft", String(left));
        setFreeLeft(left);
        canProceed = true;
      } else {
        // Paid: check credits via API (requires auth)
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;
        if (!token) {
          setError(
            "Free preview used. Please sign in and buy a bundle to continue.",
          );
          setLoading(false);
          window.clearInterval(timer);
          return;
        }
        const creditRes = await fetch("/api/credits/use", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!creditRes.ok) throw new Error("No credits available");
        canProceed = true;
      }

      if (!canProceed) return;

      // Send to /api/stylize (multipart)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", buildPrompt());
      fd.append("species", subject === "auto" ? "" : (subject as Species));
      fd.append("aspectRatio", "1:1");
      fd.append("preset_label", presetLabel);

      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token || null;

      const res = await fetch("/api/stylize", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      // always parse JSON (our API guarantees JSON)
      const out = await res.json().catch(() => ({}) as any);
      if (!res.ok) {
        throw new Error(out?.error || "Generation failed");
      }

      // The simple/legacy route responds with { output: string }
      // The newer polling route responds with { output_url }
      const url: string | null = out.output_url || out.output || null;
      if (!url) throw new Error("No output URL returned");
      setResult(url);

      // Save a local history entry for UX continuity
      pushLocal({
        prompt,
        species: subject === "auto" ? null : (subject as Species),
        preset_label: presetLabel,
        output_url: url,
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      window.clearInterval(timer);
      setPercent(100);
      setTimeout(() => setLoading(false), 250);
    }
  };

  const downloadNow = async () => {
    if (!result) return;
    try {
      // Try our proxy to ensure correct mime/headers; fallback to direct open
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(result)}`);
      const blob = await res.blob();
      if (!blob || (blob.size < 20 * 1024 && !result.startsWith("data:"))) {
        window.open(result, "_blank");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "portrait.jpg";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      window.open(result, "_blank");
    }
  };

  return (
    <main className="grid gap-6">
      {/* Creator card */}
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="text-sm opacity-80">
            Free preview left: <b>{freeLeft}</b>
          </div>
          <div className="flex gap-2">
            {freeLeft <= 0 && (
              <>
                {!signedIn && (
                  <a className="btn-outline" href="/login">
                    Sign in
                  </a>
                )}
                <a className="btn-secondary" href="/bundles">
                  Buy bundles
                </a>
              </>
            )}
            {ALLOW_RESET && (
              <button
                className="btn-outline"
                onClick={() => {
                  try {
                    localStorage.setItem("freeGenerationsLeft", "1");
                    setFreeLeft(1);
                  } catch {}
                }}
                title="Testing helper"
              >
                Reset free
              </button>
            )}
          </div>
        </div>

        {/* Subject */}
        <div className="grid gap-2">
          <Label>Subject in photo</Label>
          <div className="flex gap-2 flex-wrap">
            <label className="btn-outline">
              <input
                type="radio"
                name="subject"
                className="mr-2"
                checked={subject === "auto"}
                onChange={() => {
                  setSubject("auto");
                  setPresetIdx(0);
                }}
              />
              Auto (safe)
            </label>
            <label className="btn-outline">
              <input
                type="radio"
                name="subject"
                className="mr-2"
                checked={subject === "dog"}
                onChange={() => {
                  setSubject("dog");
                  setPresetIdx(0);
                }}
              />
              Dog
            </label>
            <label className="btn-outline">
              <input
                type="radio"
                name="subject"
                className="mr-2"
                checked={subject === "cat"}
                onChange={() => {
                  setSubject("cat");
                  setPresetIdx(0);
                }}
              />
              Cat
            </label>
          </div>
          <p className="text-xs opacity-70">
            We’ll tailor the styles to your chosen subject. <b>Auto</b> merges
            both sets and neutralizes species words in the prompt.
          </p>
        </div>

        {/* Preset */}
        <div className="grid gap-2">
          <Label>Style preset</Label>
          <select
            className="select"
            value={presetIdx}
            onChange={(e) => setPresetIdx(parseInt(e.target.value, 10))}
          >
            {presets.map((p, i) => (
              <option key={i} value={i}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="text-xs opacity-70">
            Selected preset: <b>{presetLabel}</b>
          </div>
        </div>

        {/* Prompt */}
        <div className="grid gap-2">
          <Label>Editable prompt</Label>
          <textarea
            className="input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Upload */}
        <div className="grid gap-2">
          <Label>Upload one image of your pet</Label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={onChange}
          />
        </div>

        {/* Submit */}
        <button
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
          onClick={onSubmit}
          disabled={loading || !file}
        >
          {loading ? `Generating… ${percent}%` : "Generate portrait"}
        </button>

        {/* Error */}
        {error && <p className="text-red-400">{error}</p>}

        {/* Preview / Result panel */}
        {(showPanel || result) && (
          <div className="grid gap-4">
            <div className="text-sm opacity-80">
              Preset used: <b>{presetLabel}</b>
            </div>

            <div className="grid gap-3 sm:grid-cols-[160px_1fr] items-start">
              {/* Input preview */}
              <div className="grid gap-2">
                {preview ? (
                  <img
                    className="preview"
                    src={preview}
                    alt="original upload"
                  />
                ) : (
                  <div className="skeleton-pattern" />
                )}
                <div className="text-xs opacity-70 text-center">Original</div>
              </div>

              {/* Output */}
              <div className="grid gap-2">
                {!result && <div className="skeleton-pattern" />}
                {result && (
                  <ProgressiveImage
                    className="w-full"
                    src={result}
                    alt="generated portrait"
                  />
                )}
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="btn-primary"
                    onClick={downloadNow}
                    disabled={!result}
                  >
                    Download
                  </button>
                  <a
                    className={`btn-outline ${!result ? "opacity-60 pointer-events-none" : ""}`}
                    href={result || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View full size
                  </a>
                </div>
              </div>
            </div>

            {loading && (
              <div className="text-xs opacity-70">
                Generating… this can take a moment.
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
