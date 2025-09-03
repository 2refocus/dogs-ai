"use client";
import { useEffect, useMemo, useState } from "react";
import { PRESETS, type Species } from "./presets";
// replace
// import BeforeAfter from "@/components/BeforeAfter";
// with
import BeforeAfter from "../components/BeforeAfter";

export default function Page() {
  const [species, setSpecies] = useState<Species>("dog");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>(PRESETS["dog"][0].value);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState<number>(1);

  const presets = useMemo(() => PRESETS[species], [species]);

  useEffect(() => { setPrompt(presets[presetIdx]?.value || ""); }, [species, presetIdx]);
  useEffect(() => {
    const key = localStorage.getItem("freeGenerationsLeft"); if (key === null) localStorage.setItem("freeGenerationsLeft", "1");
    setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null; setFile(f); setResult(null); setError(null);
  };

  const onSubmit = async () => {
    if (!file) return;
    if (freeLeft <= 0) { setError("Free preview used. Please sign in and buy a bundle to continue."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("prompt", prompt);
      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data.output);
      const left = Math.max(0, freeLeft - 1); localStorage.setItem("freeGenerationsLeft", String(left)); setFreeLeft(left);
    } catch (e:any) { setError(e.message || "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="text-sm opacity-80">Free preview left: <b>{freeLeft}</b></div>
          <a className="btn" href="/bundles">Buy bundles</a>
        </div>

        <div className="grid gap-2">
          <label className="label">Species</label>
          <select className="select" value={species} onChange={e => { setSpecies(e.target.value as Species); setPresetIdx(0); }}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </select>
        </div>

        <div className="grid gap-2">
          <label className="label">Style preset</label>
          <select className="select" value={presetIdx} onChange={e => setPresetIdx(parseInt(e.target.value, 10))}>
            {presets.map((p, i) => (<option key={i} value={i}>{p.label}</option>))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="label">Editable prompt</label>
          <textarea className="input" value={prompt} onChange={e => setPrompt(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <label className="label">Upload one image of your pet</label>
          <input className="input" type="file" accept="image/*" onChange={onChange} />
        </div>

        <div>
          <button className="btn" onClick={onSubmit} disabled={!file || loading || freeLeft <= 0}>
            {loading ? "Generating…" : (freeLeft > 0 ? "Generate free portrait" : "Buy bundle to continue")}
          </button>
          {error && <p className="mt-3 text-red-300">{error}</p>}
        </div>
      </section>

      {result && file && (
        <section className="card grid gap-3">
          <h3 className="text-lg font-semibold">Before ↔ After</h3>
          <BeforeAfter before={URL.createObjectURL(file)} after={result} />
          <div className="mt-3 flex gap-3">
            <a className="btn" href={result} target="_blank" rel="noreferrer">Open</a>
            <a className="btn" href={result} download>Download</a>
          </div>
        </section>
      )}
    </main>
  );
}
