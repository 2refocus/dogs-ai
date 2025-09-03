"use client";
import { useEffect, useState } from "react";

type Style = "pattern" | "shimmer" | "solid";
type Speed = "fast" | "normal" | "slow";

export default function SettingsPage() {
  const [style, setStyle] = useState<Style>("pattern");
  const [speed, setSpeed] = useState<Speed>("normal");

  useEffect(() => {
    try {
      const s = (localStorage.getItem("loadingStyle") as Style) || "pattern";
      const p = (localStorage.getItem("loadingSpeed") as Speed) || "normal";
      setStyle(s); setSpeed(p);
      document.documentElement.setAttribute("data-loading-style", s);
      document.documentElement.setAttribute("data-skeleton-speed", p);
    } catch {}
  }, []);

  const apply = (s: Style, p: Speed) => {
    setStyle(s); setSpeed(p);
    try { localStorage.setItem("loadingStyle", s); localStorage.setItem("loadingSpeed", p); } catch {}
    document.documentElement.setAttribute("data-loading-style", s);
    document.documentElement.setAttribute("data-skeleton-speed", p);
  };

  return (
    <main className="grid gap-6">
      <section className="card grid gap-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="label">Loading appearance</label>
            <select className="select" value={style} onChange={(e) => apply(e.target.value as Style, speed)}>
              <option value="pattern">Pattern (default)</option>
              <option value="shimmer">Shimmer</option>
              <option value="solid">Solid</option>
            </select>
            <p className="text-xs opacity-70">How placeholders look while generating/loading.</p>
          </div>
          <div className="grid gap-2">
            <label className="label">Loading speed</label>
            <select className="select" value={speed} onChange={(e) => apply(style, e.target.value as Speed)}>
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="slow">Slow</option>
            </select>
            <p className="text-xs opacity-70">Animation speed of placeholders.</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="label">Preview</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="skeleton-pattern" style={{ height: 160 }} />
            <div className="skeleton-pattern" style={{ height: 160 }} />
          </div>
        </div>
      </section>
    </main>
  );
}
