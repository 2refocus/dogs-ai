
/* app/history/page.tsx — guest local history + public latest */
"use client";
import { useEffect, useState } from "react";

type Item = { output_url: string; created_at?: string };

export default function HistoryPage() {
  const [local, setLocal] = useState<Item[]>([]);
  const [pub, setPub] = useState<Item[]>([]);

  useEffect(() => {
    // local
    try {
      const raw = localStorage.getItem("local_generations_v1");
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) setLocal(arr);
    } catch {}

    // public
    (async () => {
      try {
        const r = await fetch("/api/community", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok && Array.isArray(j.items)) setPub(j.items);
      } catch {}
    })();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6 grid gap-8">
      <section>
        <h1 className="text-xl font-bold mb-3">Your History</h1>
        {local.length === 0 ? (
          <p className="opacity-70">Nothing yet. Generate your first portrait on the home page.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {local.map((it, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
                <img src={it.output_url} alt="" className="w-full h-full object-cover aspect-square" />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Community (latest)</h2>
        {pub.length === 0 ? (
          <p className="opacity-70">No public images yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pub.map((it, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
                <img src={it.output_url} alt="" className="w-full h-full object-cover aspect-square" />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
