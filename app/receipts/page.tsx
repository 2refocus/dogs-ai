"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Payment = { id: number; created_at: string; bundle_id: string; credits: number; amount_cents: number; currency: string; stripe_session_id: string | null; };

export default function ReceiptsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/receipts/list", { headers: { Authorization: `Bearer ${token}` } });
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
        <h2 className="text-xl font-semibold mb-2">Your receipts</h2>
        {!items.length && <p className="opacity-80">No purchases yet.</p>}
        <div className="grid gap-3">
          {items.map((p) => (
            <div key={p.id} className="card bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <div><b>{p.bundle_id}</b> — {p.credits} credits</div>
                  <div className="opacity-80">{new Date(p.created_at).toLocaleString()}</div>
                </div>
                <div className="text-sm">
                  <div><b>{(p.amount_cents / 100).toFixed(2)}</b> {p.currency?.toUpperCase?.() || ""}</div>
                  {p.stripe_session_id && <div className="opacity-70">Session: {p.stripe_session_id}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
