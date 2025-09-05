/* app/history/page.tsx — guest history (local only) */
"use client";

import { useEffect, useState } from "react";
import { readLocal, type LocalGen } from "@/lib/localHistory";

export default function HistoryPage() {
  const [items, setItems] = useState<LocalGen[]>([]);

  useEffect(() => {
    try {
      setItems(readLocal());
    } catch {}
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6 grid gap-6">
      <h1 className="text-2xl font-semibold">Your History</h1>
      {items.length === 0 ? (
        <p className="opacity-70">Nothing yet. Generate your first portrait on the home page.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
              <img src={it.output_url} alt="" className="w-full aspect-square object-cover" />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
