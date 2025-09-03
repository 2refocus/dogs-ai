"use client";
import { useEffect, useRef, useState } from "react";

export default function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onMove = (x: number) => {
      const rect = el.getBoundingClientRect();
      const clamped = Math.min(Math.max(x - rect.left, 0), rect.width);
      setPos(Math.round((clamped / rect.width) * 100));
    };
    const down = (e: MouseEvent | TouchEvent) => {
      if (e instanceof MouseEvent) onMove(e.clientX);
      else onMove((e as TouchEvent).touches[0].clientX);
      const move = (ev: MouseEvent | TouchEvent) => {
        if (ev instanceof MouseEvent) onMove(ev.clientX);
        else onMove((ev as TouchEvent).touches[0].clientX);
      };
      const up = () => {
        window.removeEventListener("mousemove", move as any);
        window.removeEventListener("touchmove", move as any);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchend", up);
      };
      window.addEventListener("mousemove", move as any);
      window.addEventListener("touchmove", move as any);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
    };
    el.addEventListener("mousedown", down as any);
    el.addEventListener("touchstart", down as any);
    return () => {
      el.removeEventListener("mousedown", down as any);
      el.removeEventListener("touchstart", down as any);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10" ref={ref}>
      <img src={after} className="block w-full h-auto select-none" alt="after" />
      <div className="absolute inset-0 pointer-events-none" style={{ clipPath: `inset(0 ${100-pos}% 0 0)` }}>
        <img src={before} className="block w-full h-auto select-none" alt="before" />
      </div>
      <div className="absolute top-0 bottom-0" style={{ left: `${pos}%` }}>
        <div className="w-0.5 h-full bg-white/70"></div>
        <div className="absolute -top-3 -translate-x-1/2 text-xs bg-white text-black px-2 py-0.5 rounded">Drag</div>
      </div>
    </div>
  );
}
