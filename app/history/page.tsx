/* app/history/page.tsx — shows Supabase history if authed; else local fallback */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getLocal, type LocalItem } from "@/lib/localHistory";

type Row = {
  id: string;
  output_url: string | null;
  created_at: string;
  prompt?: string | null;
  preset_label?: string | null;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        // local fallback
        const local = getLocal();
        setRows(local as any);
        setLoading(false);
        return;
      }
      // fetch from Supabase
      const { data: gens, error } = await supabase
        .from("generations")
        .select("id, output_url, created_at, prompt, preset_label")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        console.warn("history supabase error", error.message);
        setRows([]);
      } else {
        setRows((gens || []).filter((r) => r.output_url) as any);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold mb-4">Your history</h1>
      {loading && <div className="opacity-60">Loading…</div>}
      {!loading && rows.length === 0 && <div className="opacity-60">No items yet.</div>}
      {!loading && rows.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
              <div className="relative aspect-square bg-black/10">
                {r.output_url ? (
                  <img src={r.output_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm opacity-60">No image</div>
                )}
              </div>
              <div className="p-3 text-xs opacity-75 flex items-center justify-between">
                <span>{new Date(r.created_at).toLocaleString()}</span>
                {r.output_url && (
                  <a className="underline" href={r.output_url} target="_blank" rel="noreferrer">open</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}