"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      setUser(data.session?.user ?? null);
      if (token) {
        const res = await fetch("/api/credits/status", { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        setCredits(j?.credits ?? 0);
      }
    });
  }, []);

  if (!user) return <main className="card">Please <a className="link" href="/login">sign in</a>.</main>;

  return (
    <main className="grid gap-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">Your account</h2>
        <p>Email: <b>{user.email}</b></p>
        <p>Credits: <b>{credits ?? "…"}</b></p>
      </section>
    </main>
  );
}
