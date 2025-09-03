"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (!email) {
    return (
      <main className="card">
        <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
        <p>Please <Link className="link" href="/login">sign in</Link> to view your dashboard.</p>
      </main>
    );
  }

  return (
    <main className="grid gap-6">
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">Welcome, {email}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Link className="btn" href="/">Create portrait</Link>
          <Link className="btn" href="/history">View history</Link>
          <Link className="btn" href="/bundles">Buy credits</Link>
          <Link className="btn" href="/receipts">Receipts</Link>
          <Link className="btn" href="/account">Account</Link>
        </div>
      </section>
    </main>
  );
}
