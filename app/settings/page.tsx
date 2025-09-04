"use client";
import { useEffect, useState } from "react";

type Style = "pattern" | "shimmer" | "solid";
type Speed = "fast" | "normal" | "slow";
type AR = "1:1" | "4:5" | "3:4" | "16:9";

const ARS: { key: AR; label: string }[] = [
  { key: "1:1", label: "Square" },
  { key: "4:5", label: "Portrait 4:5" },
  { key: "3:4", label: "Portrait 3:4" },
  { key: "16:9", label: "Wide 16:9" },
];

export default function SettingsPage() {
  const [style, setStyle] = useState<Style>("shimmer");
  const [speed, setSpeed] = useState<Speed>("normal");
  const [ar, setAr] = useState<AR>("1:1");

  // init from localStorage
  useEffect(() => {
    try {
      setStyle((localStorage.getItem("loadingStyle") as Style) || "shimmer");
      setSpeed((localStorage.getItem("loadingSpeed") as Speed) || "normal");
      setAr((localStorage.getItem("aspectRatio") as AR) || "1:1");
    } catch {}
  }, []);

  const apply = (s: Style, p: Speed) => {
    setStyle(s);
    setSpeed(p);
    try {
      localStorage.setItem("loadingStyle", s);
      localStorage.setItem("loadingSpeed", p);
    } catch {}
  };

  const chooseAR = (val: AR) => {
    setAr(val);
    try {
      localStorage.setItem("aspectRatio", val);
    } catch {}
  };

  return (
    <main className="p-6 grid gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Loading style</label>
          <select
            value={style}
            onChange={(e) => apply(e.target.value as Style, speed)}
            className="select"
          >
            <option value="pattern">Pattern</option>
            <option value="shimmer">Shimmer</option>
            <option value="solid">Solid</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Loading speed</label>
          <select
            value={speed}
            onChange={(e) => apply(style, e.target.value as Speed)}
            className="select"
          >
            <option value="fast">Fast</option>
            <option value="normal">Normal</option>
            <option value="slow">Slow</option>
          </select>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Aspect Ratio</h2>
        <div className="flex flex-wrap gap-3">
          {ARS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => chooseAR(key)}
              className={`px-3 py-2 rounded border ${
                ar === key ? "bg-yellow-500 text-white" : "bg-gray-800 text-gray-200"
              }`}
            >
              {label} ({key})
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}