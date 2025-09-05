/* app/page.tsx */
"use client";
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // show smaller original, bigger result on notebook/desktop
  // grid: left 1fr, right 2fr (md+). On mobile stack.
  const onPick = (f: File | null) => {
    setFile(f);
    setResult("");
    setMsg("");
    if (!f) {
      setPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  async function onSubmit() {
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }
    setLoading(true);
    setMsg("Creating…");

    const fd = new FormData();
    fd.append("file", file);
    fd.append(
      "prompt",
      "Dramatic fine-art portrait of a pet inside a grand castle hall, against an ornate background wall, lit in rich cinematic lighting. Inspired by Annie Leibovitz, elegant, intricate details, painterly yet realistic, ultra high quality., 1:1",
    );

    try {
      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await res.json();
      if (!res.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        return;
      }

      const id = create.prediction_id as string;
      setMsg("Generating…");

      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        await new Promise((r) => setTimeout(r, 1200));
        const r2 = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const j = await r2.json();

        const urls: string[] = Array.isArray(j.urls) ? j.urls : [];
        const out = Array.isArray(j.output)
          ? j.output
          : typeof j.output === "string"
            ? [j.output]
            : [];
        const url = (urls[0] || out[0] || "") as string;

        if (j.status === "succeeded" || j.status === "completed") {
          if (!url) {
            setMsg("Done but no output URL");
            break;
          }
          setResult(url);
          setMsg("Done ✔");
          break;
        }
        if (j.status === "failed" || j.status === "canceled") {
          setMsg(`Failed: ${j.error || "unknown error"}`);
          break;
        }
      }
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  // simple shimmer block
  function Shimmer() {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#141821]">
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,#141821,45%,#1c2230,55%,#141821)] bg-[length:200%_100%]" />
        <div className="sr-only">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e13] text-white">
      <NavBar />

      <main className="mx-auto max-w-6xl px-4 py-8 grid gap-6">
        {/* Uploader */}
        <section className="grid gap-3">
          <label className="text-sm font-medium">Upload a pet photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
            className="file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:text-white file:hover:bg-white/20
                       block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-amber-400/50"
          />
          <button
            onClick={onSubmit}
            disabled={loading || !file}
            className="rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </section>

        {/* Preview + Result */}
        <section className="grid gap-6 md:grid-cols-[1fr_2fr]">
          {/* Original (small) */}
          <div className="rounded-2xl border border-white/10 bg-[#0f131b] p-4">
            <div className="aspect-square overflow-hidden rounded-xl bg-[#121722]">
              {preview ? (
                <img
                  src={preview}
                  alt="Original"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-sm text-white/50">
                  Original
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-white/60">Original</div>
          </div>

          {/* Generated (large) */}
          <div className="rounded-2xl border border-white/10 bg-[#0f131b] p-4">
            <div className="aspect-square overflow-hidden rounded-xl bg-[#121722]">
              {loading ? (
                <Shimmer />
              ) : result ? (
                <img
                  src={result}
                  alt="Generated"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-sm text-white/50">
                  Generated
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-white/60">
              <span>Generated</span>
              {result && (
                <a
                  className="rounded-md border border-white/10 px-2 py-1 text-white/80 hover:bg-white/5"
                  href={result}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              )}
            </div>
            {msg && <div className="mt-2 text-xs text-white/60">{msg}</div>}
          </div>
        </section>
      </main>
    </div>
  );
}
