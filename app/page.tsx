"use client";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>(
    "Painterly watercolor portrait of the dog, soft pastel palette, gentle brush strokes, clean background, sharp whiskers and fur detail"
  );
  const [out, setOut] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <section className="card">
        <label className="label">Upload one image of your dog</label>
        <input className="input mb-3" type="file" accept="image/*" onChange={onChange} />
        <label className="label">Style prompt (editable)</label>
        <textarea className="input mb-3" value={prompt} onChange={e => setPrompt(e.target.value)} />
        <button className="btn" onClick={onSubmit} disabled={!file || loading}>
          {loading ? "Generating…" : "Generate portrait"}
        </button>
        {error && <p className="mt-3 text-red-300">{error}</p>}
      </section>

      {out && (
        <section className="card">
          <h3 className="text-lg font-semibold mb-2">Result</h3>
          <img src={out} alt="result" className="preview" />
          <div className="mt-3 flex gap-3">
            <a className="btn" href={out} target="_blank">Open</a>
            <a className="btn" href={out} download>Download</a>
          </div>
        </section>
      )}
    </main>
  );
}
