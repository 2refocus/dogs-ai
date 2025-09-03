"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { readLocal } from "@/lib/localHistory";

type Item = {
  id?: number | string;
  created_at: string;
  prompt: string | null;
  species: string | null;
  preset_label: string | null;
  output_url: string;
};

export default function HistoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const local = readLocal();
      let server: Item[] = [];
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (token) {
        const res = await fetch("/api/history/list", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const j = await res.json(); server = j.items || [];
        }
      }
      // Merge & dedupe by output_url
      const map = new Map<string, Item>();
      [...server, ...local].forEach(it => {
        if (!map.has(it.output_url)) map.set(it.output_url, it);
      });
      const merged = Array.from(map.values()).sort((a,b) => +new Date(b.created_at) - +new Date(a.created_at));
      setItems(merged);
      setLoading(false);
    })();
  }, []);

  const downloadViaProxy = async (url: string) => {
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "portrait.jpg";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      window.open(url, "_blank");
    }
  };

  if (loading) return <main className="card">Loading…</main>;

  return (
    <main className="grid gap-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">Your history</h2>
        {!items.length && <p className="opacity-80">No generations yet.</p>}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it, idx) => (
            <div key={(it as any).id ?? idx} className="card bg-white/5">
              <img className="preview" src={it.output_url} alt={it.preset_label ?? "result"} />
              <div className="mt-2 text-sm opacity-80">
                <div><b>{it.preset_label || "Custom"}</b>{it.species ? ` · ${it.species}` : ""}</div>
                <div>{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <button className="btn mt-3" onClick={() => downloadViaProxy(it.output_url)}>Download</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
