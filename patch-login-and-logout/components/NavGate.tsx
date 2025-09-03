"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NavGate() {
  const [freeLeft, setFreeLeft] = useState<number>(1);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Free-left gate
    const key = localStorage.getItem("freeGenerationsLeft");
    if (key === null) localStorage.setItem("freeGenerationsLeft", "1");
    setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10));

    // Auth state
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Hide until needed: only show after user signs in OR after free used up
  if (freeLeft > 0 && !email) return null;

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link className="btn !px-3 !py-1" href="/">Home</Link>
      <Link className="btn !px-3 !py-1" href="/bundles">Bundles</Link>
      {email ? (
        <>
          <Link className="btn !px-3 !py-1" href="/dashboard">Dashboard</Link>
          <Link className="btn !px-3 !py-1" href="/history">History</Link>
          <button className="btn !px-3 !py-1" onClick={signOut} aria-label="Sign out">Logout</button>
        </>
      ) : (
        <Link className="btn !px-3 !py-1" href="/login">Login</Link>
      )}
    </nav>
  );
}
