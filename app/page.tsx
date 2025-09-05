/* app/page.tsx — Full UI pass
   - Upload bar at top
   - Square result with shimmer while generating
   - Placeholder image before + during generation
   - Free flow: no presets
   - Presets are gated: show only when user is signed in
   - Persists generations for signed-in users
   - Shows a public gallery (flexible: works with or without a "public" column)
*/
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PRESETS, type Species } from "@/app/presets";

type PublicRow = { output_url: string | null; created_at: string };
type ViewCols = 1 | 2 | 3 | 6;

const DEFAULT_PROMPT =
  "Elegant fine‑art pet portrait, warm light, matte studio look, 1:1 crop, high detail";

const ALLOW_RESET = process.env.NEXT_PUBLIC_ALLOW_TEST_RESET === "1";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium opacity-90">{children}</label>;
}

function Shimmer() {
  return (
    <div
      className="absolute inset-0 animate-pulse"
      style={{
        background:
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.06) 50%, rgba(255,255,255,0) 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

export default function Home() {
  // ---- auth / gating
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSignedIn(Boolean(s))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- input
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // ---- generation
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [img, setImg] = useState<string>("");
  const [percent, setPercent] = useState(0);

  // ---- presets (gated by sign-in)
  const [subject, setSubject] = useState<Species>("dog");
  const [presetIdx, setPresetIdx] = useState(0);
  const mergedPresets = useMemo(() => {
    const lbl = new Set<string>();
    const all = [...PRESETS.dog, ...PRESETS.cat];
    return all.filter((p) => (lbl.has(p.label) ? false : (lbl.add(p.label), true)));
  }, []);
  const currentPrompt = useMemo(() => {
    if (!signedIn) return DEFAULT_PROMPT;
    const arr = subject === "dog" ? PRESETS.dog : PRESETS.cat;
    return arr[presetIdx]?.value || DEFAULT_PROMPT;
  }, [signedIn, subject, presetIdx]);

  // ---- public gallery
  const [publicImages, setPublicImages] = useState<PublicRow[]>([]);
  useEffect(() => {
    (async () => {
      try {
        // Prefer a "public" boolean column if it exists.
        // If querying with "public" fails, fall back to no filter.
        let q = supabase
          .from("generations")
          .select("output_url,created_at")
          .order("created_at", { ascending: false })
          .limit(24);
        const withPublic = await supabase
          .from("generations")
          .select("output_url,created_at,public")
          .eq("public", true)
          .order("created_at", { ascending: false })
          .limit(24);

        let rows: any[] | null = null;
        if (!withPublic.error) {
          rows = withPublic.data?.filter((r: any) => r.output_url);
        } else {
          const anyRows = await q;
          rows = anyRows.data?.filter((r: any) => r.output_url) ?? [];
        }
        setPublicImages((rows || []) as PublicRow[]);
      } catch {}
    })();
  }, []);

  // ---- helpers
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setImg("");
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function saveGeneration(outputUrl: string, prompt: string) {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) return; // anonymous users don't persist
      await supabase.from("generations").insert({
        user_id: user.id,
        output_url: outputUrl,
        prompt,
        // Add preset fields later if you add them back to the form:
        // preset_id, preset_label, input_url, etc.
        public: true, // optional; ignore if your schema doesn't have this column
      } as any);
    } catch (e) {
      // Non-blocking
      console.warn("saveGeneration failed", e);
    }
  }

  async function onSubmit() {
    if (!file) {
      setMsg("Pick a file first.");
      return;
    }
    setLoading(true);
    setPercent(1);
    setImg("");
    setMsg("Uploading…");

    const tick = window.setInterval(() => {
      setPercent((p) => (p < 87 ? p + Math.max(1, Math.round((87 - p) / 8)) : p));
    }, 350);

    try {
      // 1) Create prediction
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prompt", currentPrompt);
      fd.append("aspectRatio", "1:1");

      const createRes = await fetch("/api/stylize", { method: "POST", body: fd });
      const create = await createRes.json();
      if (!createRes.ok || !create?.prediction_id) {
        setMsg(create?.error || "Create failed");
        return;
      }

      setMsg("Generating…");
      const id = create.prediction_id as string;

      // 2) Poll predictions endpoint
      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        await new Promise((r) => setTimeout(r, 1200));
        const g = await fetch(`/api/predictions/${id}`, { cache: "no-store" });
        const j = await g.json();

        let url: string | null = null;
        if (Array.isArray(j.urls) && j.urls.length > 0) url = j.urls[0];
        else if (Array.isArray(j.output) && j.output.length > 0) url = j.output[0];
        else if (typeof j.output === "string" && j.output) url = j.output;

        if (j.status === "succeeded" || j.status === "completed") {
          if (!url) {
            setMsg("Done but no output URL");
            break;
          }
          setImg(url);
          setMsg("Done ✔");
          setPercent(100);
          saveGeneration(url, currentPrompt);
          break;
        }
        if (j.status === "failed" || j.status === "canceled") {
          setMsg(`Failed: ${j.error || "unknown error"}`);
          break;
        }
      }
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setTimeout(() => setPercent(100), 250);
      setTimeout(() => setPercent(0), 1200);
      try { /* no-op */ } catch {}
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 grid gap-8">
      {/* Header (minimal) */}
      <header className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Pet Portrait Studio <span className="opacity-60">*</span></div>
          <div className="text-xs opacity-70">Elegant & cozy portraits of your pets</div>
        </div>
        <nav className="flex items-center gap-2">
          <a className="btn-outline" href="/bundles">Bundles</a>
          <a className="btn-outline" href="/history">History</a>
          <a className="btn-outline" href="/login">Login</a>
        </nav>
      </header>

      {/* Creator */}
      <section className="card grid gap-4 p-4 sm:p-6">
        {/* Upload bar */}
        <div className="grid gap-2">
          <Label>Upload a pet photo</Label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={onFile}
          />
        </div>

        {/* Presets (gated) */}
        {signedIn ? (
          <div className="grid gap-2">
            <Label>Style preset</Label>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-2">
                <label className="btn-outline">
                  <input
                    type="radio"
                    name="subject"
                    className="mr-2"
                    checked={subject === "dog"}
                    onChange={() => {
                      setSubject("dog");
                      setPresetIdx(0);
                    }}
                  />
                  Dog
                </label>
                <label className="btn-outline">
                  <input
                    type="radio"
                    name="subject"
                    className="mr-2"
                    checked={subject === "cat"}
                    onChange={() => {
                      setSubject("cat");
                      setPresetIdx(0);
                    }}
                  />
                  Cat
                </label>
              </div>
              <select
                className="select"
                value={presetIdx}
                onChange={(e) => setPresetIdx(parseInt(e.target.value, 10))}
              >
                {(subject === "dog" ? PRESETS.dog : PRESETS.cat).map((p, i) => (
                  <option key={i} value={i}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs opacity-70">Advanced styling is available when logged in.</p>
          </div>
        ) : (
          <p className="text-xs opacity-70">
            Using the default house style. <a className="underline" href="/login">Log in</a> to choose from presets.
          </p>
        )}

        {/* Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSubmit}
            disabled={loading || !file}
            className={`btn-primary ${loading ? "btn-loading" : ""}`}
          >
            {loading ? `Generating… ${percent}%` : "Generate portrait"}
          </button>

          {ALLOW_RESET && (
            <button
              className="btn-outline text-xs"
              onClick={() => {
                localStorage.setItem("freeGenerationsLeft", "1");
                alert("Free preview reset to 1");
              }}
            >
              Reset free
            </button>
          )}
        </div>

        {/* Preview + Result */}
        <div className="grid gap-3 sm:grid-cols-[minmax(160px,220px)_1fr] items-start">
          {/* Left: preview */}
          <div className="grid gap-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#131313]">
              <img
                src={preview || "/placeholder.svg"}
                alt="preview"
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            </div>
            <div className="text-xs opacity-70 text-center">Original</div>
          </div>

          {/* Right: result */}
          <div className="grid gap-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#131313]">
              {img ? (
                <img
                  src={img}
                  alt="result"
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <img
                  src="/placeholder.svg"
                  alt="placeholder"
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                  draggable={false}
                />
              )}

              {loading && <Shimmer />}
            </div>
            <div className="flex gap-2 flex-wrap">
              <a
                className={`btn-outline ${!img ? "opacity-60 pointer-events-none" : ""}`}
                href={img || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                View full size
              </a>
              {img && (
                <a className="btn-primary" href={img} download>
                  Download
                </a>
              )}
            </div>
          </div>
        </div>

        {msg && <div className="text-sm opacity-80">{msg}</div>}
      </section>

      {/* Public gallery */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest from the community</h2>
          <a className="text-sm underline opacity-80 hover:opacity-100" href="/history">
            Your history
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {publicImages.length === 0 && (
            <div className="col-span-full text-sm opacity-70">No public images yet.</div>
          )}
          {publicImages.map((r, idx) => (
            <figure key={idx} className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#151515]">
              {r.output_url ? (
                <img
                  src={r.output_url}
                  alt="public generation"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <img
                  src="/placeholder.svg"
                  alt="placeholder"
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              )}
            </figure>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs opacity-70">
        Made with ❤️ — build: ui
      </footer>
    </main>
  );
}
