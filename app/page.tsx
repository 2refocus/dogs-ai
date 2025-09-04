"use client";
import { useEffect, useMemo, useState } from "react";
import { PRESETS } from "@/app/presets";
import { supabase } from "@/lib/supabaseClient";
import { pushLocal } from "@/lib/localHistory";
import ProgressiveImage from "@/components/ProgressiveImage";

export const dynamic = "force-dynamic";

type SubjectMode = "dog" | "cat" | "auto";

const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";

async function createPrediction(file: File, prompt: string, token?: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("prompt", prompt);

  const res = await fetch("/api/stylize", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || "Generation failed");

  if (j?.prediction_id) return { id: j.prediction_id as string, legacyUrl: null };
  if (j?.output_url) return { id: null, legacyUrl: j.output_url as string };
  throw new Error("Unexpected response from /api/stylize");
}

async function pollPrediction(id: string, onTick?: (pct: number) => void) {
  const t0 = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - t0 < timeoutMs) {
    const res = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
    const j = await res.json();
    if (!res.ok || j?.ok === false) throw new Error(j?.error || "Prediction fetch failed");

    if (j.status === "succeeded" || j.status === "completed") {
      const url = Array.isArray(j.urls) ? j.urls[0] : null;
      if (url) return url;
      throw new Error("No output URL returned");
    }
    if (j.status === "failed" || j.status === "canceled") {
      throw new Error(j?.error || `Prediction ${j.status}`);
    }

    if (onTick) onTick(Math.min(99, 10 + Math.floor((Date.now() - t0) / 500)));
    await new Promise(r => setTimeout(r, 1200));
  }
  throw new Error("Timed out waiting for Replicate result");
}

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
    [...PRESETS.dog, ...PRESETS.cat].forEach(p => {
      if (!seen.has(p.label)) { seen.add(p.label); res.push(p); }
    });
    return res;
  }, []);

  const presets = useMemo(() => {
    if (subject === "dog") return PRESETS.dog;
    if (subject === "cat") return PRESETS.cat;
    return mergedPresets;
  }, [subject, mergedPresets]);

  const presetLabel = presets[presetIdx]?.label || "Custom";

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f); setResult(null); setError(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else { setPreview(null); }
  };

  const onSubmit = async () => {
    if (!file) { setError("Please select an image first."); return; }
    setLoading(true); setError(null); setResult(null); setPercent(1); setShowPanel(true);
    const timer = window.setInterval(() => {
      setPercent(p => (p < 87 ? p + Math.max(1, Math.round((87 - p) / 8)) : p));
    }, 300);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || undefined;
      const created = await createPrediction(file, prompt, token);
      if (created.legacyUrl) {
        setResult(created.legacyUrl);
      } else if (created.id) {
        const url = await pollPrediction(created.id, pct => setPercent(pct));
        setResult(url);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      window.clearInterval(timer);
      setPercent(100);
      setTimeout(() => setLoading(false), 250);
    }
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
        <input type="file" onChange={onChange} />
        <button className="btn-primary" onClick={onSubmit}>Generate</button>
        {error && <p className="text-red-400">{error}</p>}
        {result && <ProgressiveImage className="w-full" src={result} alt="generated" />}
      </section>
    </main>
  );
}
