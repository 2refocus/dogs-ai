/* app/history/page.tsx — guest history from localStorage, fallback to community */
"use client";
import { useEffect, useState } from "react";
import { readLocal } from "@/lib/localHistory";

type Row = { id:string; output_url:string; created_at:string };

export default function HistoryPage() {
  const [local, setLocal] = useState<Row[]>([]);
  const [community, setCommunity] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try { setLocal(readLocal() as any); } catch {}
    (async () => {
      try {
        const r = await fetch("/api/community", { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) setCommunity(j.items || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const rows = local.length > 0 ? local : community;

  return (
    <main className="mx-auto max-w-4xl p-6 grid gap-4">
      <h1 className="text-xl font-bold">Your History</h1>
      {loading && <div className="text-sm opacity-60">Loading…</div>}
      {!loading && rows.length === 0 && (
        <div className="text-sm opacity-60">Nothing yet. Generate your first portrait on the home page.</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {rows.map((it) => (
          <div key={it.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
            <div className="aspect-square bg-black/10">
              <img src={it.output_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="p-2 text-xs opacity-60">{new Date(it.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </main>
  );
}