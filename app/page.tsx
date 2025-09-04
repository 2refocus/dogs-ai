/* app/page.tsx — image-first UI with placeholder + skeleton + styled default */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PRESETS } from "@/app/presets";

/** Safely extract an output URL from varying Replicate responses */
function extractOutputUrl(j: any): string | null {
  if (!j) return null;
  if (Array.isArray(j.urls) && j.urls[0]) return String(j.urls[0]);
  if (Array.isArray(j.output) && j.output[0]) return String(j.output[0]);
  if (typeof j.output === "string" && j.output) return j.output as string;
  if (j?.raw && typeof j.raw === "object") {
    const r = j.raw;
    if (Array.isArray(r.output) && r.output[0]) return String(r.output[0]);
    if (typeof r.output === "string" && r.output) return r.output as string;
  }
  return null;
}

type Species = "dog" | "cat" | "auto";
type Preset = { label: string; value: string };

const PLACEHOLDER =
  // put your local/public placeholder here (this can be in /public)
  "/placeholder-square.jpg";

export default function Home() {
  // --- core state
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<string>("");              // generated
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0);
  const pctTimer = useRef<number | null>(null);

  // --- preview of the upload (acts as a visible placeholder once user selected)
  const [preview, setPreview] = useState<string>("");

  // --- auth + gated style controls
  const [authed, setAuthed] = useState(false);
  const [subject, setSubject] = useState<Species>("auto");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setAuthed(Boolean(s))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Merge dog+cat when "auto", otherwise species-specific
  const mergedPresets: Preset[] = useMemo(() => {
    const seen = new Set<string>();
    const combo: Preset[] = [];
    [...PRESETS.dog, ...PRESETS.cat].forEach((p) => {
      if (!seen.has(p.label)) {
        seen.add(p.label);
        combo.push(p);
      }
    });
    return combo;
  }, []);

  const presets = useMemo(() => {
    if (!authed) return []; // guests don’t see the selector
    if (subject === "dog") return PRESETS.dog;
    if (subject === "cat") return PRESETS.cat;
    return mergedPresets;
  }, [authed, subject, mergedPresets]);

  const presetLabel = authed ? (presets[presetIdx]?.label ?? "Custom") : "Fine-Art Studio";

  // Keep the editable prompt in sync when auth/preset changes
  useEffect(() => {
    if (!authed) {
      // for guests we’ll fill a strong default when we submit
      setPrompt("");
      return;
    }
    const base = presets[presetIdx]?.value ?? "";
    if (subject === "auto") {
      setPrompt(
        base.replace(/\bdog(s)?\b/gi, "pet$1").replace(/\bcat(s)?\b/gi, "pet$1")
      );
    } else {
      setPrompt(base);
    }
  }, [authed, presetIdx, subject, presets]);

  /** Default style (used for guests) — tuned to look clearly stylized */
  const DEFAULT_FREE_PROMPT =
    "Fine-art studio portrait of a pet, warm golden-hour light, soft rim light, " +
    "crisp details, shallow depth (f/1.8), 1:1 crop, elegant grading, no text or watermark";

  function startPct() {
    setPercent(1);
    if (pctTimer.current) window.clearInterval(pctTimer.current);
    pctTimer.current = window.setInterval(() => {
      setPercent((p) => (p < 88 ? p + Math.max(1, Math.round((88 - p) / 8)) : p));
    }, 280) as unknown as number;
  }
  function stopPct() {
    if (pctTimer.current) window.clearInterval(pctTimer.current);
    pctTimer.current = null;
    setPercent(100);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setImg("");
    if (f) {
      const r = new FileReader();
      r.onload = () => setPreview(String(r.result || ""));
      r.readAsDataURL(f);
    } else {
      setPreview("");
    }
  }

  async function onSubmit() {
    setMsg("Starting…");
    setImg("");
    if (!file) {
      setMsg("Please pick a file first.");
      return;
    }
    setLoading(true);
    startPct();

    try {
      const fd = new FormData();
      fd.append("file", file);

      // Always push a strong style. If authed, use their current prompt from the selector.
      const finalPrompt = authed && prompt.trim().length > 0 ? prompt : DEFAULT_FREE_PROMPT;
      fd.append("prompt", finalPrompt);

      // Keep 1:1
      fd.append("aspectRatio", "1:1");

      // Record some meta so your /api/stylize persists to Supabase for homepage later
      fd.append("public", "1"); // signal the API to persist to a public gallery/feed
      if (authed) {
        fd.append("preset_label", presetLabel);
        if (subject !== "auto") fd.append("species", subject);
      } else {
        fd.append("preset_label", "Default (Fine-Art Studio)");
      }

      // Create prediction (your route should return { prediction_id })
      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await res.json();
      if (!res.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        stopPct();
        return;
      }

      setMsg("Created. Polling…");
      const id = String(create.prediction_id);

      const t0 = Date.now();
      while (Date.now() - t0 < 120_000) {
        await new Promise((r) => setTimeout(r, 1200));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const j = await g.json();

        if (!g.ok) {
          setMsg(j?.error || "Poll failed");
          break;
        }

        if (j.status === "succeeded" || j.status === "completed") {
          const url = extractOutputUrl(j);
          if (!url) {
            setMsg("Done, but no output URL was returned.");
          } else {
            setImg(url);
            setMsg("Done ✔");
          }
          break;
        }

        if (j.status === "failed" || j.status === "canceled") {
          setMsg(`Failed: ${j?.error || "unknown error"}`);
          break;
        }
      }
    } catch (e: any) {
      setMsg(e?.message || "Unexpected error");
    } finally {
      setLoading(false);
      stopPct();
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6 grid gap-6">
      {/* IMAGE FIRST: placeholder -> skeleton -> result */}
      <div className="relative w-full aspect-square overflow-hidden rounded-xl shadow">
        {/* base placeholder (global) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview || PLACEHOLDER}
          alt="placeholder"
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            img ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* skeleton while generating */}
        {loading && (
          <div className="absolute inset-0">
            <div className="shimmer" />
            <div className="absolute bottom-2 right-3 text-xs px-2 py-1 rounded bg-black/60 text-white">
              Generating… {percent}%
            </div>
          </div>
        )}

        {/* generated image replaces everything on success */}
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="result" className="h-full w-full object-cover" />
        )}
      </div>

      {/* CONTROLS */}
      <section className="grid gap-4 card">
        <div className="text-sm opacity-80">{msg}</div>

        <div className="grid gap-2">
          <label className="label">Upload an image</label>
          <input className="input" type="file" accept="image/*" onChange={onFile} />
        </div>

        {/* GATED (auth only): subject + presets + editable prompt */}
        {authed && (
          <div className="grid gap-4 border rounded-lg p-3">
            <div className="grid gap-2">
              <label className="label">Subject in photo</label>
              <div className="flex flex-wrap gap-2">
                <label className="btn-outline">
                  <input
                    type="radio"
                    name="species"
                    className="mr-2"
                    checked={subject === "auto"}
                    onChange={() => setSubject("auto")}
                  />
                  Auto (safe)
                </label>
                <label className="btn-outline">
                  <input
                    type="radio"
                    name="species"
                    className="mr-2"
                    checked={subject === "dog"}
                    onChange={() => setSubject("dog")}
                  />
                  Dog
                </label>
                <label className="btn-outline">
                  <input
                    type="radio"
                    name="species"
                    className="mr-2"
                    checked={subject === "cat"}
                    onChange={() => setSubject("cat")}
                  />
                  Cat
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="label">Style preset</label>
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
                Selected: <b>{presetLabel}</b>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="label">Editable prompt</label>
              <textarea
                className="input"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={onSubmit}
            disabled={loading || !file}
            className={`btn-primary ${loading ? "btn-loading" : ""}`}
          >
            {loading ? `Generating… ${percent}%` : "Generate"}
          </button>
          {!authed && (
            <a className="btn-outline" href="/login">
              Log in to choose styles
            </a>
          )}
        </div>

        {img && (
          <div className="flex gap-2">
            <a className="btn-outline" href={img} target="_blank" rel="noreferrer">
              View full size
            </a>
            <a className="btn-primary" href={img} download>
              Download
            </a>
          </div>
        )}
      </section>
    </main>
  );
}