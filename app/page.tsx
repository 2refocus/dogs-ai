/* app/page.tsx — simple poller + placeholder + skeleton + Supabase save */
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function HomeMinimalPoller() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("/placeholder.jpg");
  const [loading, setLoading] = useState<boolean>(false);
  const [percent, setPercent] = useState<number>(0);

  useEffect(() => {
    let t: any;
    if (loading) {
      t = setInterval(() => {
        setPercent((p) => (p < 92 ? p + Math.max(1, Math.round((92 - p) / 6)) : p));
      }, 300);
    }
    return () => t && clearInterval(t);
  }, [loading]);

  async function saveGeneration(url: string, prompt: string) {
    try {
      const { data: auth } = await supabase.auth.getSession();
      const user_id = auth?.session?.user?.id ?? null;

      // Insert the least risky shape — many projects only have these two columns.
      const { error } = await supabase
        .from("generations")
        .insert([{ output_url: url, prompt, user_id }]); // user_id is optional in many schemas

      if (error) {
        // Don't break UX if RLS or schema differs.
        console.warn("Supabase save skipped:", error.message);
      }
    } catch (e: any) {
      console.warn("Supabase save skipped:", e?.message || e);
    }
  }

  async function onSubmit() {
    setMsg("Starting…");
    setLoading(true);
    setPercent(3);
    setImg("/placeholder.jpg");

    if (!file) {
      setMsg("Pick a file first.");
      setLoading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);
      // Keep the prompt simple for free users; your backend can add style defaults.
      const prompt = "Elegant fine‑art pet portrait, warm light, 1:1 crop";
      fd.append("prompt", prompt);

      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await res.json();
      if (!res.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        setLoading(false);
        return;
      }

      setMsg("Created. Polling…");
      const id = create.prediction_id as string;

      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        await new Promise((r) => setTimeout(r, 1200));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const j = await g.json();

        const urls: string[] = Array.isArray(j.urls) ? j.urls : Array.isArray(j.output) ? j.output : [];
        const single: string | null = typeof j.output === "string" ? j.output : null;
        const url = single || (urls && urls.length ? urls[0] : null);

        if (!g.ok) {
          setMsg(j?.error || "Poll failed");
          setLoading(false);
          return;
        }

        if (j.status === "succeeded" || j.status === "completed") {
          if (!url) {
            setMsg("Done but no output URL");
            setLoading(false);
            return;
          }
          setImg(url as string);
          setMsg("Done ✔");
          setPercent(100);
          setTimeout(() => setLoading(false), 200);
          // Fire-and-forget save (doesn't block UI)
          saveGeneration(url as string, prompt);
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
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 grid gap-4">
      <div className="grid gap-3">
        <label className="text-sm font-medium">Upload a pet photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setMsg("");
            setImg("/placeholder.jpg");
          }}
          className="input"
        />
        <button onClick={onSubmit} className={`btn-primary ${loading ? "btn-loading" : ""}`} disabled={loading || !file}>
          {loading ? `Generating… ${percent}%` : "Generate portrait"}
        </button>
      </div>

      <div className="relative w-full aspect-square overflow-hidden rounded-lg border">
        {/* Placeholder / Result image */}
        <Image
          src={img}
          alt="result"
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
          priority
        />
        {/* Skeleton overlay while loading */}
        {loading && <div className="absolute inset-0 animate-pulse bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.08)_0px,rgba(0,0,0,0.08)_10px,rgba(0,0,0,0.12)_10px,rgba(0,0,0,0.12)_20px)]" />}
      </div>

      <div className="text-sm opacity-80">{msg}</div>
    </main>
  );
}
