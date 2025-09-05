"use client";
import { useState } from "react";
import ProgressiveImage from "@/components/ProgressiveImage";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("");
  const [preview, setPreview] = useState<string>("");

  async function onSubmit() {
    setMsg("Starting…");
    setImg("");
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("prompt", "Elegant fine‑art pet portrait, warm light, 1:1 crop");
    const res = await fetch("/api/stylize", { method: "POST", body: fd });
    const create = await res.json();
    if (!res.ok || !create?.prediction_id) {
      setMsg(create?.error || "Create failed");
      return;
    }
    setMsg("Created. Polling…");
    const id = create.prediction_id as string;
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      await new Promise((r) => setTimeout(r, 1200));
      const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
      const j = await g.json();
      let url: string | null = null;
      if (Array.isArray(j.urls) && j.urls.length > 0) url = j.urls[0];
      else if (Array.isArray(j.output) && j.output.length > 0) url = j.output[0];
      else if (typeof j.output === "string") url = j.output;
      if (j.status === "succeeded" && url) {
        setImg(url);
        setMsg("Done ✔");
        return;
      }
      if (j.status === "failed" || j.status === "canceled") {
        setMsg(`Failed: ${j.error || "unknown error"}`);
        return;
      }
    }
    setMsg("Timed out while polling.");
  }

  return (
    <main className="mx-auto max-w-2xl p-6 grid gap-6">
      <div className="grid gap-3">
        <label className="text-sm font-medium">Upload a pet photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            if (f) {
              const reader = new FileReader();
              reader.onload = () => setPreview(reader.result as string);
              reader.readAsDataURL(f);
            }
          }}
        />
      </div>
      <button onClick={onSubmit} className="btn-primary w-full">
        Generate
      </button>
      <div className="text-sm">{msg}</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          {preview ? (
            <img src={preview} alt="preview" className="rounded" />
          ) : (
            <img src="/placeholder.svg" alt="placeholder" className="rounded" />
          )}
          <span className="text-xs text-center opacity-70">Original</span>
        </div>
        <div className="grid gap-2">
          {!img ? (
            <div className="skeleton-pattern w-full h-64 rounded" />
          ) : (
            <ProgressiveImage src={img} alt="result" className="rounded" />
          )}
          <span className="text-xs text-center opacity-70">Generated</span>
        </div>
      </div>
    </main>
  );
}
