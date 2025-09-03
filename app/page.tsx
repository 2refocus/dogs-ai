"use client";
import { useEffect, useMemo, useState } from "react";
import { PRESETS, type Species } from "@/app/presets";
import { supabase } from "@/lib/supabaseClient";
import BeforeAfter from "@/components/BeforeAfter";

export const dynamic = "force-dynamic";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";

export default function Home() {
  const [species, setSpecies] = useState<Species>("dog");
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState<number>(1);
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);

  const presets = useMemo(() => PRESETS[species], [species]);

  useEffect(() => { setPrompt(presets[presetIdx]?.value || ""); }, [species, presetIdx, presets]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("resetFree") === "1") {
          localStorage.setItem("freeGenerationsLeft", "1");
          setFreeLeft(1);
          const url = new URL(window.location.href);
          url.searchParams.delete("resetFree");
          window.history.replaceState({}, "", url.pathname + url.search);
        } else {
          const key = localStorage.getItem("freeGenerationsLeft");
          if (key === null) localStorage.setItem("freeGenerationsLeft", "1");
          setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10));
        }
      }
    } catch {}

    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null; setFile(f); setResult(null); setError(null);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const onSubmit = async () => {
    if (!file) { setError("Please select an image first."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      let token: string | null = null;
      let canProceed = false;

      if (freeLeft > 0) {
        const left = Math.max(0, freeLeft - 1);
        localStorage.setItem("freeGenerationsLeft", String(left));
        setFreeLeft(left);
        canProceed = true;
      } else {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;
        if (!token) {
          setError("Free preview used. Please sign in and buy a bundle to continue.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/credits/use", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "No credits available");
        canProceed = true;
      }

      if (canProceed) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prompt", prompt);
        fd.append("species", species);
        fd.append("preset_label", presets[presetIdx]?.label || "");

        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;

        const res = await fetch("/api/stylize", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || "Generation failed");
        setResult(out.output);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetFree = () => {
    localStorage.setItem("freeGenerationsLeft", "1");
    setFreeLeft(1);
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="text-sm opacity-80">Free preview left: <b>{freeLeft}</b></div>
          <div className="flex gap-2">
            {freeLeft <= 0 && (
              <>
                {!signedIn && <a className="btn" href="/login">Sign in</a>}
                <a className="btn" href="/bundles">Buy bundles</a>
              </>
            )}
            {ALLOW_RESET && <button className="btn" onClick={resetFree} title="Testing helper">Reset free</button>}
          </div>
        </div>

        {/* --- Generator UI ALWAYS visible --- */}
        <div className="grid gap-2">
          <Label>Species</Label>
          <select className="select" value={species} onChange={e => { setSpecies(e.target.value as Species); setPresetIdx(0); }}>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label>Style preset</Label>
          <select className="select" value={presetIdx} onChange={e => setPresetIdx(parseInt(e.target.value, 10))}>
            {presets.map((p, i) => (<option key={i} value={i}>{p.label}</option>))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label>Editable prompt</Label>
          <textarea className="input" value={prompt} onChange={e => setPrompt(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label>Upload one image of your pet</Label>
          <input className="input" type="file" accept="image/*" onChange={onChange} />
        </div>

        <button className="btn" onClick={onSubmit} disabled={loading || !file}>
          {loading ? "Generating…" : "Generate portrait"}
        </button>

        {error && <p className="text-red-400">{error}</p>}
        {preview && result && (<BeforeAfter before={preview} after={result} />)}
        {!preview && result && (<img className="preview" src={result} alt="result" />)}
      </section>
    </main>
  );
}
