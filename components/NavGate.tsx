"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NavGate() {
  const [freeLeft, setFreeLeft] = useState<number>(1);
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const key = localStorage.getItem("freeGenerationsLeft");
    if (key === null) localStorage.setItem("freeGenerationsLeft", "1");
    setFreeLeft(parseInt(localStorage.getItem("freeGenerationsLeft") || "1", 10));

    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
  };

  // Hide nav until needed (after free is used and not signed in)
  if (freeLeft > 0 && !email) return null;

  const Menu = () => (
    <div className="menu-panel" ref={panelRef}>
      <Link className="menu-item" href="/" onClick={() => setOpen(false)}>Home</Link>
      <Link className="menu-item" href="/bundles" onClick={() => setOpen(false)}>Bundles</Link>
      {email ? (
        <>
          <Link className="menu-item" href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link className="menu-item" href="/history" onClick={() => setOpen(false)}>History</Link>
          <button className="menu-item text-left" onClick={signOut}>Logout</button>
        </>
      ) : (
        <Link className="menu-item" href="/login" onClick={() => setOpen(false)}>Login</Link>
      )}
    </div>
  );

  return (
    <div className="relative">
      {/* Desktop */}
      <nav className="hidden sm:flex items-center gap-2 text-sm">
        <Link className="btn-secondary !px-3 !py-1" href="/">Home</Link>
        <Link className="btn-secondary !px-3 !py-1" href="/bundles">Bundles</Link>
        {email ? (
          <>
            <Link className="btn-secondary !px-3 !py-1" href="/dashboard">Dashboard</Link>
            <Link className="btn-secondary !px-3 !py-1" href="/history">History</Link>
            <button className="btn-secondary !px-3 !py-1" onClick={signOut}>Logout</button>
          </>
        ) : (
          <Link className="btn-secondary !px-3 !py-1" href="/login">Login</Link>
        )}
      </nav>

      {/* Mobile burger */}
      <button className="sm:hidden burger" aria-label="Open menu" onClick={() => setOpen(v => !v)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {open && <Menu />}
    </div>
  );
}
