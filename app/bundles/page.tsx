"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const BUNDLES = [
  { id: "starter", name: "Starter", credits: 10 },
  { id: "standard", name: "Standard", credits: 30 },
  { id: "pro", name: "Pro", credits: 100 }
];

export default function BundlesPage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  return (
    <main className="grid gap-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">Buy credits</h2>
        {!user && <p className="mb-3">Please <a className="link" href="/login">sign in</a> to purchase bundles.</p>}
        <div className="grid md:grid-cols-3 gap-4">
          {BUNDLES.map(b => (
            <div key={b.id} className="card bg-white/5">
              <h3 className="text-lg font-semibold">{b.name}</h3>
              <p className="opacity-80">{b.credits} portraits</p>
              <button className="btn mt-3" disabled={!user} onClick={() => alert("Hook to Stripe in /api/checkout/session")}>
                {user ? "Buy" : "Sign in to buy"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
