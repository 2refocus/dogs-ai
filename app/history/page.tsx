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
  const [token, setToken] = useState<string | null>(null);
  const [cols, setCols] = useState<1 | 2 | 3 | 6>(1); // default 1 on mobile

  useEffect(() => {
    // Server + local merge
    (async () => {
      const local = readLocal();
      let server: Item[] = [];
      const { data: sess } = await supabase.auth.getSession();
      const t = sess.session?.access_token || null;
      setToken(t);
      if (t) {
        const res = await fetch("/api/history/list", { headers: { Authorization: `Bearer ${t}` } });
        if (res.ok) {
          const j = await res.json(); server = j.items || [];
        }
      }
      const map = new Map<string, Item>();
      [...server, ...local].forEach(it => { if (!map.has(it.output_url)) map.set(it.output_url, it); });
      const merged = Array.from(map.values()).sort((a,b) => +new Date(b.created_at) - +new Date(a.created_at));
      setItems(merged);
      setLoading(false);
    })();
  }, []);

  // Auto-adjust columns by screen width (1 col on <640px)
  useEffect(() => {
    const apply = () => {
      if (window.innerWidth < 640) setCols(1);
      else if (window.innerWidth < 900) setCols(2);
      else setCols(3);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
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

  const deleteItem = async (it: Item) => {
    if (token && typeof it.id === "number") {
      const res = await fetch("/api/history/delete", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: it.id })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        alert(j?.error || "Delete failed on server; removing locally.");
      }
    }
    try {
      const raw = localStorage.getItem("localGenerations");
      const arr: Item[] = raw ? JSON.parse(raw) : [];
      const filtered = arr.filter(x => x.output_url !== it.output_url);
      localStorage.setItem("localGenerations", JSON.stringify(filtered));
    } catch {}
    setItems(prev => prev.filter(x => x.output_url !== it.output_url));
  };

  const GridControls = () => (
    <div className="hidden sm:flex items-center gap-2">
      <span className="text-sm opacity-80">View:</span>
      <button className={`btn-outline btn-sm ${cols===2 ? '!bg-white/10' : ''}`} onClick={() => setCols(2)}>2×</button>
      <button className={`btn-outline btn-sm ${cols===3 ? '!bg-white/10' : ''}`} onClick={() => setCols(3)}>3×</button>
      <button className={`btn-outline btn-sm ${cols===6 ? '!bg-white/10' : ''}`} onClick={() => setCols(6)}>6×</button>
    </div>
  );

  if (loading) return <main className="card">Loading…</main>;

  return (
    <main className="grid gap-6">
      <section className="card">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-xl font-semibold">Your history</h2>
          <GridControls />
        </div>

        {!items.length && <p className="opacity-80">No generations yet.</p>}

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {items.map((it, idx) => (
            <div key={(it as any).id ?? idx} className="card bg-white/5">
              <img className="preview" src={it.output_url} alt={it.preset_label ?? "result"} style={{ width: '100%', height: 'auto' }} />
              <div className="mt-2 text-sm opacity-80 truncate">
                <div className="truncate"><b>{it.preset_label || "Custom"}</b>{it.species ? ` · ${it.species}` : ""}</div>
                <div>{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <div className="actions mt-3">
                <button className="btn-primary btn-sm" onClick={() => downloadViaProxy(it.output_url)}>Download</button>
                <button className="btn-outline btn-sm" onClick={() => window.open(it.output_url, "_blank")}>View</button>
                <button className="btn-secondary btn-sm" onClick={() => deleteItem(it)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
