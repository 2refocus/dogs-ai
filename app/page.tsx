"use client";
import { useState } from "react";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("/placeholder.jpg");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!file) {
      setMsg("Please select a file.");
      return;
    }
    setMsg("Starting…");
    setLoading(true);
    setImg("/placeholder.jpg");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("prompt", "Elegant fine‑art pet portrait, warm light, 1:1 crop");

    const res = await fetch("/api/stylize", { method: "POST", body: fd });
    const create = await res.json();
    if (!res.ok || !create?.prediction_id) {
      setMsg(create?.error || "Create failed");
      setLoading(false);
      return;
    }

    const id = create.prediction_id as string;
    setMsg("Created. Polling…");

    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      await new Promise((r) => setTimeout(r, 1500));
      const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
      const j = await g.json();

      let url: string | null = null;
      if (Array.isArray(j.urls) && j.urls.length > 0) url = j.urls[0];
      else if (Array.isArray(j.output) && j.output.length > 0) url = j.output[0];
      else if (typeof j.output === "string") url = j.output;

      if (url && url.startsWith("http")) {
        setImg(url);
        setMsg("Done ✔");
        setLoading(false);
        return;
      }

      if (j.status === "failed" || j.status === "canceled") {
        setMsg(`Failed: ${j.error || "unknown error"}`);
        setLoading(false);
        return;
      }
    }
    setMsg("Timed out while polling.");
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-xl p-6 grid gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="border p-2"
      />
      <button
        onClick={onSubmit}
        className={`border p-2 rounded ${loading ? "opacity-50" : ""}`}
        disabled={loading}
      >
        {loading ? "Generating…" : "Generate"}
      </button>
      <div>{msg}</div>
      <div className="relative w-full aspect-square bg-gray-200">
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-gray-300" />
        )}
        <img src={img} alt="result" className="w-full h-full object-cover" />
      </div>
    </main>
  );
}
