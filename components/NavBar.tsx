"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const onSignOut = async () => { await supabase.auth.signOut(); };

  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link className="btn" href="/">Home</Link>
      <Link className="btn" href="/history">History</Link>
      <Link className="btn" href="/receipts">Receipts</Link>
      <Link className="btn" href="/bundles">Bundles</Link>
      {!email ? (
        <Link className="btn" href="/login">Login</Link>
      ) : (
        <>
          <Link className="btn" href="/account">Account</Link>
          <button className="btn" onClick={onSignOut}>Sign out</button>
        </>
      )}
    </nav>
  );
}
