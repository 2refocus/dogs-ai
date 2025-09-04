"use client";
import { useEffect, useState } from "react";

type Style = "pattern" | "shimmer" | "solid";
type Speed = "fast" | "normal" | "slow";
type AR = "1:1" | "4:5" | "3:4" | "16:9";

const ARS: { key: AR; label: string; w: number; h: number }[] = [
  { key: "1:1", label: "Square", w: 100, h: 100 },
  { key: "4:5", label: "Portrait 4:5", w: 96, h: 120 },
  { key: "3:4", label: "Portrait 3:4", w: 90, h: 120 },
  { key: "16:9", label: "Wide 16:9", w: 128, h: 72 },
];

export default function SettingsPage() {
  const [style, setStyle] = useState<Style>("shimmer");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [ar, setAr] = useState<AR>("1:1"); // square default

  useEffect(() => {
    try {
      const s = (localStorage.getItem("loadingStyle") as Style) || "shimmer";
      const p = (localStorage.getItem("loadingSpeed") as Speed) || "normal";
      const a = (localStorage.getItem("aspectRatio") as AR) || "1:1";
      setStyle(s); setSpeed(p); setAr(a);
      document.documentElement.setAttribute("data-loading-style", s);
      document.documentElement.setAttribute("data-skeleton-speed", p);
      document.documentElement.setAttribute("data-aspect-ratio", a);
    } catch {}
  }, []);

  const apply = (s: Style, p: Speed) => {
    setStyle(s); setSpeed(p);
    try { localStorage.setItem("loadingStyle", s); localStorage.setItem("loadingSpeed", p); } catch {}
    document.documentElement.setAttribute("data-loading-style", s);
    document.documentElement.setAttribute("data-skeleton-speed", p);
  };

  const chooseAR = (val: AR) => {
    setAr(val);
    try { localStorage.setItem("aspectRatio", val); } catch {}
    document.documentElement.setAttribute("data-aspect-ratio", val);
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
        <h1 className="text-xl font-semibold">Settings</h1>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="label">Loading appearance</label>
            <select className="select" value={style} onChange={(e) => apply(e.target.value as Style, speed)}>
              <option value="pattern">Pattern</option>
              <option value="shimmer">Shimmer</option>
              <option value="solid">Solid</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="label">Loading speed</label>
            <select className="select" value={speed} onChange={(e) => apply(style, e.target.value as Speed)}>
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="slow">Slow</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3">
          <h2 className="text-lg font-semibold mt-2">Aspect Ratio</h2>
          <p className="text-xs opacity-70">Choose the framing used for generated portraits. Applies instantly.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ARS.map(({ key, label, w, h }) => (
              <button
                key={key}
                onClick={() => chooseAR(key)}
                className={\`ratio-card \${ar === key ? 'active' : ''}\`}
                title={label}
                aria-pressed={ar === key}
              >
                <div className="ratio-box" style={{ width: w, height: h }}/>
                <div className="ratio-label">{label}<span className="opacity-70"> · {key}</span></div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
