"use client";
import React, { useEffect, useState } from "react";

type Style = "pattern" | "shimmer" | "solid";
type Speed = "fast" | "normal" | "slow";
type AR = "1:1" | "4:5" | "3:4" | "16:9";

export default function SettingsPage(): JSX.Element {
  const [style, setStyle] = useState<Style>("shimmer");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [ar, setAr] = useState<AR>("1:1");

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

  function chooseAR(val: AR) {
    setAr(val);
    try { localStorage.setItem("aspectRatio", val); } catch {}
    document.documentElement.setAttribute("data-aspect-ratio", val);
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

      <div>
        <h2 className="text-lg font-semibold mb-2">Aspect Ratio</h2>
        <div className="flex flex-wrap gap-3">
          {(["1:1","4:5","3:4","16:9"] as AR[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseAR(key)}
              className={
                "px-3 py-2 rounded border " +
                (ar === key ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-200")
              }
            >
              {key === "1:1" ? "Square" : key === "16:9" ? "Wide 16:9" : `Portrait ${key}`} ({key})
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
