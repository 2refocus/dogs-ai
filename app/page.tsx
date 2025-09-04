/* app/page.tsx — Simple free flow + auth-gated presets, image-first UI */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PRESETS } from "@/app/presets";

/** Robustly pull a single URL from whatever Replicate returns. */
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

export default function Home() {
  // --- core state
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0);
  const pctTimer = useRef<number | null>(null);

  // --- auth + gated controls
  const [authed, setAuthed] = useState(false);
  const [subject, setSubject] = useState<Species>("auto");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>("Elegant fine-art pet portrait, warm light, 1:1 crop");

  useEffect(() => {
    // session check
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Build merged presets if "auto" (dog+cat), else species specific
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
    if (!authed) return []; // hidden for non-logged users
    if (subject === "dog") return PRESETS.dog;
    if (subject === "cat") return PRESETS.cat;
    return mergedPresets;
  }, [authed, subject, mergedPresets]);

  const presetLabel = authed ? (presets[presetIdx]?.label ?? "Custom") : "Default";
  // keep prompt in sync when auth toggles, subject/preset change (only if authed)
  useEffect(() => {
    if (!authed) return;
    const base = presets[presetIdx]?.value ?? prompt;
    if (subject === "auto") {
      // neutralize species words in the template
      setPrompt(
        base.replace(/\bdog(s)?\b/gi, "pet$1").replace(/\bcat(s)?\b/gi, "pet$1")
      );
    } else {
      setPrompt(base);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, presetIdx, subject, presets.length]);

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
      const form = new FormData();
      form.append("file", file);
      // if user is logged in we use their edited prompt; else a great default
      const finalPrompt = authed
        ? prompt
        : "Elegant fine-art pet portrait, warm light, 1:1 crop, high quality";
      form.append("prompt", finalPrompt);
      form.append("aspectRatio", "1:1");
      if (authed) {
        form.append("preset_label", presetLabel);
        if (subject !== "auto") form.append("species", subject);
      }

      // Kick off
      const r = await fetch("/api/stylize", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok || !j?.prediction_id) {
        setMsg(j?.error || "Create failed");
        setLoading(false);
        stopPct();
        return;
      }

      setMsg("Created. Polling…");
      const id = j.prediction_id as string;

      const t0 = Date.now();
      while (Date.now() - t0 < 120_000) {
        await new Promise((res) => setTimeout(res, 1200));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const pj = await g.json();

        if (!g.ok) {
          setMsg(pj?.error || "Poll failed");
          break;
        }

        if (pj.status === "succeeded" || pj.status === "completed") {
          const url = extractOutputUrl(pj);
          if (!url) {
            setMsg("Done, but no output URL was returned.");
          } else {
            setImg(url);
            setMsg("Done ✔");
          }
          break;
        }

        if (pj.status === "failed" || pj.status === "canceled") {
          setMsg(`Failed: ${pj?.error || "unknown error"}`);
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
      {/* IMAGE FIRST */}
      {img ? (
        <div className="w-full">
          <div className="relative w-full aspect-square overflow-hidden rounded-xl shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="result" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : loading ? (
        <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-muted">
          <div className="shimmer" />
          <div className="absolute bottom-2 right-3 text-xs px-2 py-1 rounded bg-black/60 text-white">
            Generating… {percent}%
          </div>
        </div>
      ) : null}

      {/* CONTROLS */}
      <section className="grid gap-4 card">
        <div className="text-sm opacity-80">{msg}</div>

        <div className="grid gap-2">
          <label className="label">Upload an image</label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        {/* GATED CONTROLS — only when logged in */}
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