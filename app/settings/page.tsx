"use client";
import React, { useEffect, useState } from "react";

export default function SettingsPage() {
  const [style, setStyle] = useState("shimmer");
  const [speed, setSpeed] = useState("normal");
  const [ar, setAr] = useState("1:1");

  useEffect(function init() {
    try {
      const s = localStorage.getItem("loadingStyle") || "shimmer";
      const p = localStorage.getItem("loadingSpeed") || "normal";
      const a = localStorage.getItem("aspectRatio") || "1:1";
      setStyle(s);
      setSpeed(p);
      setAr(a);
      document.documentElement.setAttribute("data-loading-style", s);
      document.documentElement.setAttribute("data-skeleton-speed", p);
      document.documentElement.setAttribute("data-aspect-ratio", a);
    } catch (e) { /* ignore */ }
  }, []);

  function onStyleChange(ev) {
    const s = ev.target.value;
    setStyle(s);
    try { localStorage.setItem("loadingStyle", s); } catch {}
    document.documentElement.setAttribute("data-loading-style", s);
  }

  function onSpeedChange(ev) {
    const p = ev.target.value;
    setSpeed(p);
    try { localStorage.setItem("loadingSpeed", p); } catch {}
    document.documentElement.setAttribute("data-skeleton-speed", p);
  }

  function chooseAR(val) {
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
          <button type="button" onClick={() => chooseAR("1:1")} className={"px-3 py-2 rounded border" + (ar === "1:1" ? " bg-yellow-500 text-black" : " bg-gray-800 text-gray-200")}>
            Square (1:1)
          </button>
          <button type="button" onClick={() => chooseAR("4:5")} className={"px-3 py-2 rounded border" + (ar === "4:5" ? " bg-yellow-500 text-black" : " bg-gray-800 text-gray-200")}>
            Portrait 4:5
          </button>
          <button type="button" onClick={() => chooseAR("3:4")} className={"px-3 py-2 rounded border" + (ar === "3:4" ? " bg-yellow-500 text-black" : " bg-gray-800 text-gray-200")}>
            Portrait 3:4
          </button>
          <button type="button" onClick={() => chooseAR("16:9")} className={"px-3 py-2 rounded border" + (ar === "16:9" ? " bg-yellow-500 text-black" : " bg-gray-800 text-gray-200")}>
            Wide 16:9
          </button>
        </div>
      </div>
    </main>
  );
}
