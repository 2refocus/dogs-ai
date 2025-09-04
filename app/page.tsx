"use client";
import { useEffect, useMemo, useState } from "react";
import { PRESETS } from "@/app/presets";
import { supabase } from "@/lib/supabaseClient";
import { pushLocal } from "@/lib/localHistory";
import ProgressiveImage from "@/components/ProgressiveImage";

export const dynamic = "force-dynamic";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

type SubjectMode = "dog" | "cat" | "auto";

const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";

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

  const mergedPresets = useMemo(() => {
    const seen = new Set<string>();
    const res: { label: string; value: string }[] = [];
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

  useEffect(() => {
    let base = presets[presetIdx]?.value || "";
    if (subject === "auto") {
      base = base
        .replace(/\bdog(s)?\b/gi, "pet$1")
        .replace(/\bcat(s)?\b/gi, "pet$1");
    }
    setPrompt(base);
  }, [presetIdx, subject, presets]);

  // init auth + free counter + optional ?resetFree=1 (no useSearchParams to avoid Suspense warnings)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (ALLOW_RESET && url.searchParams.get("resetFree") === "1") {
          localStorage.setItem("freeGenerationsLeft", "1");
          // optional: keep URL clean
          url.searchParams.delete("resetFree");
          window.history.replaceState({}, "", url.toString());
        }
        const key = localStorage.getItem("freeGenerationsLeft");
        if (key === null) localStorage.setItem("freeGenerationsLeft", "1");
        setFreeLeft(
          parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10),
        );
      }
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

  const buildPrompt = () => {
    if (subject === "auto") {
      let p = prompt;
      p = p.replace(/\bdog(s)?\b/gi, "pet$1").replace(/\bcat(s)?\b/gi, "pet$1");
      return p;
    }
    if (!/\bdog|cat\b/i.test(prompt)) {
      return `${prompt} ${
        subject === "dog" ? "portrait of a dog" : "portrait of a cat"
      }`.trim();
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

      if (freeLeft > 0) {
        const left = Math.max(0, freeLeft - 1);
        localStorage.setItem("freeGenerationsLeft", String(left));
        setFreeLeft(left);
        canProceed = true;
      } else {
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
        const res = await fetch("/api/credits/use", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("No credits available");
        canProceed = true;
      }

      if (canProceed) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prompt", buildPrompt());
        fd.append("species", subject === "auto" ? "" : subject);
        fd.append("aspectRatio", "1:1");
        fd.append("preset_label", presetLabel);

        // If logged in, include user_id so the API can persist to Supabase
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id || null;
        if (uid) fd.append("user_id", uid);

        const { data: sess } = await supabase.auth.getSession();
        token = sess.session?.access_token || null;

        const res = await fetch("/api/stylize", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });

        let out: any = {};
        try {
          out = await res.json();
        } catch {
          // fallback if server ever returned non-JSON
          throw new Error("Unexpected server response (not JSON)");
        }

        if (!res.ok || out?.ok === false) {
          // surface replicate error details if present
          const msg = out?.error || out?.detail || "Generation failed";
          throw new Error(msg);
        }

        // Support both shapes:
        // - new (ok + output_url)
        // - older (output)
        const url: string | null = out?.output_url || out?.output || null;

        if (!url || typeof url !== "string") {
          throw new Error("No output URL returned");
        }

        setResult(url);

        // local history (for guests)
        pushLocal({
          prompt,
          species: subject === "auto" ? null : subject,
          preset_label: presetLabel,
          output_url: url,
        });
      }
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
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(result)}`);
      const blob = await res.blob();
      if (!blob || (blob.size < 20 * 1024 && !result.startsWith("data:"))) {
        // fall back to just opening the URL if proxy produced a tiny file
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
      {/* CREATOR is always first and always visible */}
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
                  localStorage.setItem("freeGenerationsLeft", "1");
                  setFreeLeft(1);
                }}
                title="Testing helper"
              >
                Reset free
              </button>
            )}
          </div>
        </div>

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

        <div className="grid gap-2">
          <Label>Editable prompt</Label>
          <textarea
            className="input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Upload one image of your pet</Label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={onChange}
          />
        </div>

        <button
          className={`btn-primary ${loading ? "btn-loading" : ""}`}
          onClick={onSubmit}
          disabled={loading || !file}
        >
          {loading ? `Generating… ${percent}%` : "Generate portrait"}
        </button>

        {error && <p className="text-red-400">{error}</p>}

        {(showPanel || result) && (
          <div className="grid gap-4">
            <div className="text-sm opacity-80">
              Preset used: <b>{presetLabel}</b>
            </div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr] items-start">
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
