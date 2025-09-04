"use client";
import React, { useEffect, useState } from "react";

type Style = "pattern" | "shimmer" | "solid";
type Speed = "fast" | "normal" | "slow";

export default function SettingsPage(): JSX.Element {
  const [style, setStyle] = useState<Style>("shimmer");
  const [speed, setSpeed] = useState<Speed>("normal");

  useEffect(() => {
    try {
      const s = (localStorage.getItem("loadingStyle") as Style) || "shimmer";
      const p = (localStorage.getItem("loadingSpeed") as Speed) || "normal";
      setStyle(s);
      setSpeed(p);
      document.documentElement.setAttribute("data-loading-style", s);
      document.documentElement.setAttribute("data-skeleton-speed", p);
    } catch {}
  }, []);

  function onStyleChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    const s = ev.target.value as Style;
    setStyle(s);
    try { localStorage.setItem("loadingStyle", s); } catch {}
    document.documentElement.setAttribute("data-loading-style", s);
  }

  function onSpeedChange(ev: React.ChangeEvent<HTMLSelectElement>) {
    const p = ev.target.value as Speed;
    setSpeed(p);
    try { localStorage.setItem("loadingSpeed", p); } catch {}
    document.documentElement.setAttribute("data-skeleton-speed", p);
  }

  return (
    <main className="p-6 grid gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Loading style</label>
          <select className="select" value={style} onChange={onStyleChange}>
            <option value="pattern">Pattern</option>
            <option value="shimmer">Shimmer</option>
            <option value="solid">Solid</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Loading speed</label>
          <select className="select" value={speed} onChange={onSpeedChange}>
            <option value="fast">Fast</option>
            <option value="normal">Normal</option>
            <option value="slow">Slow</option>
          </select>
        </div>
      </div>

      <p className="text-xs opacity-70">Changes apply instantly.</p>
    </main>
  );
}
