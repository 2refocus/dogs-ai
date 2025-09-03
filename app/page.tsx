"use client";

import { useEffect, useMemo, useState } from "react";
import { PRESETS, type Species } from "./presets";

export default function Page() {
  const [species, setSpecies] = useState<Species>("dog");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>(PRESETS["dog"][0].value);
  const [out, setOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = useMemo(() => PRESETS[species], [species]);

  useEffect(() => {
    // When species or preset changes, update prompt (but not if user already edited? keep simple: always overwrite)
    setPrompt(presets[presetIdx]?.value || "");
  }, [species, presetIdx]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setOut(null);
    setError(null);
  };

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true); setError(null); setOut(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", prompt);
      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setOut(data.output);
    } catch (e:any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
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
          <button className="btn" onClick={onSubmit} disabled={!file || loading}>
            {loading ? "Generating…" : "Generate portrait"}
          </button>
          {error && <p className="mt-3 text-red-300">{error}</p>}
        </div>
      </section>

      {out && (
        <section className="card">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <img src={out} alt="result" className="preview" />
          <div className="mt-3 flex gap-3">
            <a className="btn" href={out} target="_blank" rel="noreferrer">Open</a>
            <a className="btn" href={out} download>Download</a>
          </div>
        </section>
      )}
    </main>
  );
}
