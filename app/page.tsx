/* app/page.tsx — full UI pass with shimmer, guest history, supabase save */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Shimmer from "@/components/Shimmer";
import { supabase } from "@/lib/supabaseClient";
import { PRESETS, type Species } from "@/app/presets";

/* --- helpers --- */
type LocalItem = { id: string; output_url: string; prompt?: string | null; created_at: string; };
const LOCAL_KEY = "guest_history_v1";
const ONE_FREE_KEY = "freeGenerationsLeft";

function pushLocal(r: LocalItem) {
  try {
    const arr: LocalItem[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    arr.unshift(r);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.slice(0, 30)));
  } catch {}
}
function readLocal(): LocalItem[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; }
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>;
}

/* --- component --- */
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [shimmer, setShimmer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [freeLeft, setFreeLeft] = useState(1);

  const [species, setSpecies] = useState<Species>("dog");
  const [presetIdx, setPresetIdx] = useState(0);
  const presets = PRESETS[species];
  const presetLabel = presets[presetIdx]?.label ?? "Classic";

  const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";
  const PLACEHOLDER = "/placeholder.svg";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONE_FREE_KEY) == null) localStorage.setItem(ONE_FREE_KEY, "1");
      setFreeLeft(parseInt(localStorage.getItem(ONE_FREE_KEY) || "1", 10));
    } catch {}
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setResult("");
    setError(null);
    if (f) {
      const r = new FileReader();
      r.onload = () => setPreview(String(r.result));
      r.readAsDataURL(f);
    } else {
      setPreview("");
    }
  }

  async function onGenerate() {
    setError(null);
    setMsg("");
    setResult("");
    if (!file) {
      setError("Please upload a photo first.");
      return;
    }

    let proceed = false;
    try {
      if (freeLeft > 0) {
        const left = Math.max(0, freeLeft - 1);
        localStorage.setItem(ONE_FREE_KEY, String(left));
        setFreeLeft(left);
        proceed = true;
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError("Free preview used — please sign in to continue.");
          return;
        }
        proceed = true;
      }
    } catch { proceed = true; }

    if (!proceed) return;

    setShimmer(true);
    setLoading(true);
    setMsg("Starting…");

    try {
      const fd = new FormData();
      fd.append("file", file);
      const prompt =
        signedIn ? presets[presetIdx]?.value :
        "Elegant fine-art pet portrait, warm light, consistent 1:1 crop, high detail, clean background";
      fd.append("prompt", prompt);

      const res = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await res.json();
      if (!res.ok || !create?.prediction_id) {
        setError(create?.error || "Create failed");
        setLoading(false);
        setShimmer(false);
        return;
      }

      setMsg("Created. Polling…");
      const id = create.prediction_id as string;

      const t0 = Date.now();
      while (Date.now() - t0 < 120_000) {
        await new Promise((r) => setTimeout(r, 1100));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const j = await g.json();

        let url: string | null = null;
        if (Array.isArray(j.urls) && j.urls.length > 0) url = j.urls[0];
        else if (Array.isArray(j.output) && j.output.length > 0) url = j.output[0];
        else if (typeof j.output === "string" && j.output) url = j.output;

        if (j.status === "succeeded" || j.status === "completed") {
          if (!url) {
            setError("Done but no output URL returned.");
            break;
          }
          setResult(url);
          setMsg("Done ✔");

          if (signedIn) {
            // saveToSupabase(url, prompt) // simplified for now
          } else {
            pushLocal({ id: uid(), output_url: url, prompt, created_at: new Date().toISOString() });
          }

          break;
        }
        if (j.status === "failed" || j.status === "canceled") {
          setError(`Failed: ${j.error || "unknown error"}`);
          break;
        }
      }
      if (!result && !error) setMsg((m) => m || "Timed out while polling.");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setShimmer(false);
    }
  }

  const guestHistory = useMemo(readLocal, [result]);

  return (
    <main>
      <Header />
      <div className="mx-auto max-w-5xl p-4 md:p-6 grid gap-6">
        <section className="grid gap-3">
          <Label>Upload a pet photo</Label>
          <input
            type="file"
            accept="image/*"
            onChange={onPick}
            className="w-full file:mr-3 file:rounded file:border file:px-3 file:py-1 file:bg-muted"
          />
          <div className="flex gap-2 items-center">
            <button
              className={`btn-primary w-full justify-center ${loading ? "opacity-80" : ""}`}
              onClick={onGenerate}
              disabled={loading || !file}
            >
              {loading ? "Generating…" : "Generate"}
            </button>
            {ALLOW_RESET && (
              <button
                className="btn-outline shrink-0"
                onClick={() => { localStorage.setItem(ONE_FREE_KEY, "1"); setFreeLeft(1); }}
              >
                Reset free
              </button>
            )}
          </div>
          <div className="text-xs opacity-70">Free left: <b>{freeLeft}</b></div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div className="card overflow-hidden">
            <div className="relative aspect-square bg-muted">
              <Image src={preview || PLACEHOLDER} alt="Preview" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"/>
            </div>
            <div className="p-3 text-xs opacity-70 text-center">Original</div>
          </div>

          <div className="card overflow-hidden relative">
            <div className="relative aspect-square bg-muted">
              <Image src={result || PLACEHOLDER} alt="Result" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover"/>
              {shimmer && <Shimmer className="absolute inset-0" />}
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="text-xs opacity-70">{msg || "Result"}</div>
              {result && (<a className="btn-outline btn-sm" href={result} target="_blank" rel="noreferrer">Open</a>)}
            </div>
            {error && <div className="px-3 pb-3 text-red-500 text-sm">{error}</div>}
          </div>
        </section>

        {!signedIn && guestHistory.length > 0 && (
          <section className="grid gap-2">
            <h2 className="text-lg font-semibold">Your recent (guest) results</h2>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {guestHistory.slice(0, 8).map((r) => (
                <li key={r.id} className="relative aspect-square overflow-hidden rounded bg-muted">
                  <Image src={r.output_url} alt="history" fill className="object-cover"/>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
