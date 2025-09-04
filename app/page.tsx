/* app/page.tsx — minimal client change to poll predictions endpoint */
"use client";
import { useState } from "react";

export default function HomeMinimalPoller() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("");

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
      // 2 minutes client-side
      await new Promise((r) => setTimeout(r, 1200));
      const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
      const j = await g.json();
      // after: const j = await r.json();
      let url: string | null = null;
      if (Array.isArray(j.urls) && j.urls.length > 0) url = j.urls[0];
      else if (Array.isArray(j.output) && j.output.length > 0)
        url = j.output[0];
      else if (typeof j.output === "string") url = j.output;

      if (!url) {
        setError("No output URL returned");
        return;
      }
      setResult(url);
      if (!g.ok) {
        setMsg(j?.error || "Poll failed");
        return;
      }
      if (j.status === "succeeded" || j.status === "completed") {
        const url = j.output || (Array.isArray(j.urls) ? j.urls[0] : null);
        if (!url) {
          setMsg("Done but no output URL");
          return;
        }
        setImg(url as string);
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
    <main className="mx-auto max-w-xl p-6 grid gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={onSubmit} className="border p-2 rounded">
        Generate
      </button>
      <div>{msg}</div>
      {img && <img src={img} alt="result" />}
    </main>
  );
}
