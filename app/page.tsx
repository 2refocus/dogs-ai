"use client";
import { useEffect, useMemo, useState } from "react";
import { PRESETS, type Species } from "@/app/presets";
import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

type SubjectMode = "dog" | "cat" | "auto";

const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";

export default function Home() {
  const [species, setSpecies] = useState<Species>("dog");
  const [subject, setSubject] = useState<SubjectMode>("auto"); // new: protects against mismatch
  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState(0); // progressive %
  const [error, setError] = useState<string | null>(null);
  const [freeLeft, setFreeLeft] = useState<number>(1);
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const presets = useMemo(() => PRESETS[species], [species]);
  const presetLabel = presets[presetIdx]?.label || "Custom";

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
    } else { setPreview(null); }
  };

  // Neutralize species in prompt if subject="auto" to avoid forcing cat->dog or vice versa.
  const buildPrompt = () => {
    if (subject === "auto") {
      let p = prompt;
      p = p.replace(/\bdog(s)?\b/gi, "pet$1");
      p = p.replace(/\bcat(s)?\b/gi, "pet$1");
      return p;
    }
    // else ensure prompt mentions correct subject at least once
    if (!/\bdog|cat\b/i.test(prompt)) {
      return `${prompt} ${subject === "dog" ? "portrait of a dog" : "portrait of a cat"}`.trim();
    }
    return prompt;
  };

  const onSubmit = async () => {
    if (!file) { setError("Please select an image first."); return; }
    setLoading(true); setError(null); setResult(null); setPercent(1);

    // Progress simulation (since replicate.run is non-streaming). Caps at 87% until we finish.
    const timer = window.setInterval(() => {
      setPercent(p => (p < 87 ? p + Math.max(1, Math.round((87 - p) / 8)) : p));
    }, 300);

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
          window.clearInterval(timer);
          return;
        }
        const res = await fetch("/api/credits/use", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("No credits available");
        canProceed = true;
      }

      if (canProceed) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("prompt", buildPrompt());
        fd.append("species", species);
        fd.append("preset_label", presetLabel);

        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;

        const res = await fetch("/api/stylize", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || "Generation failed");
        const url = out.output as string;
        setImgLoading(true);
        setResult(url);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      window.clearInterval(timer);
      setPercent(100);
      setTimeout(() => setLoading(false), 250); // let the bar reach 100% visually
    }
  };

  const downloadNow = async () => {
    if (!result) return;
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(result)}`);
      const blob = await res.blob();
      if (!blob || blob.size < 20 * 1024 && !result.startsWith("data:")) {
        window.open(result, "_blank");
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "portrait.jpg";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { window.open(result, "_blank"); }
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="text-sm opacity-80">Free preview left: <b>{freeLeft}</b></div>
          <div className="flex gap-2">
            {freeLeft <= 0 && (
              <>
                {!signedIn && <a className="btn-outline" href="/login">Sign in</a>}
                <a className="btn-secondary" href="/bundles">Buy bundles</a>
              </>
            )}
            {ALLOW_RESET && <button className="btn-outline" onClick={() => { localStorage.setItem("freeGenerationsLeft","1"); setFreeLeft(1);} } title="Testing helper">Reset free</button>}
          </div>
        </div>

        {/* --- Controls --- */}
        <div className="grid gap-2">
          <Label>Species (styles)</Label>
          <select className="select" value={species} onChange={e => { setSpecies(e.target.value as Species); setPresetIdx(0); }}>
            <option value="dog">Dog styles</option>
            <option value="cat">Cat styles</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label>Subject in photo</Label>
          <div className="flex gap-2">
            <label className="btn-outline"><input type="radio" name="subject" className="mr-2" checked={subject==="auto"} onChange={() => setSubject("auto")} />Auto (safe)</label>
            <label className="btn-outline"><input type="radio" name="subject" className="mr-2" checked={subject==="dog"} onChange={() => setSubject("dog")} />Dog</label>
            <label className="btn-outline"><input type="radio" name="subject" className="mr-2" checked={subject==="cat"} onChange={() => setSubject("cat")} />Cat</label>
          </div>
          <p className="text-xs opacity-70">
            Tip: If you’re not sure, choose <b>Auto</b>. We’ll avoid species words in the prompt so the model stays faithful to your upload.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Style preset</Label>
          <select className="select" value={presetIdx} onChange={e => setPresetIdx(parseInt(e.target.value, 10))}>
            {presets.map((p, i) => (<option key={i} value={i}>{p.label}</option>))}
          </select>
          <div className="text-xs opacity-70">Selected preset: <b>{presetLabel}</b></div>
        </div>

        <div className="grid gap-2">
          <Label>Editable prompt</Label>
          <textarea className="input" value={prompt} onChange={e => setPrompt(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label>Upload one image of your pet</Label>
          <input className="input" type="file" accept="image/*" onChange={onChange} />
        </div>

        <button className="btn-primary" onClick={onSubmit} disabled={loading || !file}>
          {loading ? (
            <span className="w-full grid gap-2">
              <span className="text-center">Generating… {percent}%</span>
              <span className="progress-wrap">
                <span className="progress-bar" style={{ width: `${percent}%` }} />
                <span className="progress-fade" />
              </span>
            </span>
          ) : "Generate portrait"}
        </button>

        {error && <p className="text-red-400">{error}</p>}

        {/* --- Result presentation: small thumb (upload) + big result --- */}
        {result && (
          <div className="grid gap-4">
            <div className="text-sm opacity-80">Preset used: <b>{presetLabel}</b></div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr] items-start">
              <div className="grid gap-2">
                {preview ? (<img className="preview" src={preview} alt="original upload" />) : (<div className="skeleton" />)}
                <div className="text-xs opacity-70 text-center">Original</div>
              </div>
              <div className="grid gap-2">
                {imgLoading && <div className="skeleton" />}
                <img className="preview" src={result} alt="generated portrait" onLoad={() => setImgLoading(false)} style={{ display: imgLoading ? "none" : "block" }} />
                <div className="flex gap-2">
                  <button className="btn-primary" onClick={downloadNow}>Download</button>
                  <a className="btn-outline" href={result} target="_blank" rel="noopener noreferrer">View full size</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
