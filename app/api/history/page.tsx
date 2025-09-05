/* app/history/page.tsx — guest vs logged in history */ 
"use client";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/community");
        const j = await res.json();
        if (j.ok) setItems(j.items);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 grid gap-4">
      <h1 className="text-xl font-bold">Community Gallery</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map((it, idx) => (
          <div key={idx} className="border rounded overflow-hidden">
            <img src={it.output_url} alt="community gen" className="w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
