"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = { id: number; created_at: string; prompt: string | null; species: string | null; preset_label: string | null; output_url: string; };

export default function HistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/history/list", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const j = await res.json(); setItems(j.items || []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <main className="card">Loading…</main>;

  return (
    <main className="grid gap-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">Your history</h2>
        {!items.length && <p className="opacity-80">No generations yet.</p>}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="card bg-white/5">
              <img className="preview" src={it.output_url} alt={it.preset_label ?? "result"} />
              <div className="mt-2 text-sm opacity-80">
                <div><b>{it.preset_label || "Custom"}</b>{it.species ? ` · ${it.species}` : ""}</div>
                <div>{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <a className="btn mt-3" href={it.output_url} download>Download</a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
