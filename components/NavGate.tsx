"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";

export default function NavGate() {
  const [isOpen, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    sessionStorage.clear();
    window.location.href = "/";
  };

  return (
    <>
      {/* Desktop navigation */}
      <nav className="hidden md:flex items-center gap-4 text-sm">
        <a href="/" className="hover:opacity-80">Home</a>
        <a href="/history" className="hover:opacity-80">History</a>
        <a href="/dashboard" className="hover:opacity-80">Dashboard</a>
        <a href="/bundles" className="hover:opacity-80">Credits</a>
        <a href="/account" className="hover:opacity-80">Account</a>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {userEmail ? (
            <button className="icon-btn" onClick={signOut} title={`Logout ${userEmail}`} aria-label="Logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          ) : (
            <a className="btn-outline btn-sm" href="/login" title="Login">Login</a>
          )}
        </div>
      </nav>

      {/* Mobile burger menu */}
      <details className="md:hidden relative">
        <summary className="list-none cursor-pointer rounded-xl border border-[var(--line)] px-3 py-2 bg-[var(--muted)] hover:bg-[var(--line)] transition-colors">☰</summary>
        <div className="fixed left-4 right-4 top-20 rounded-xl border border-[var(--line)] bg-[var(--muted)] backdrop-blur p-2 z-50">
          <a className="block px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" href="/">Home</a>
          <a className="block px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" href="/history">History</a>
          <a className="block px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" href="/dashboard">Dashboard</a>
          <a className="block px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" href="/bundles">Credits</a>
          <a className="block px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" href="/account">Account</a>
          
          <div className="border-t border-[var(--line)] my-2"></div>
          
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm opacity-70">Theme</span>
            <ThemeToggle />
          </div>
          
          {userEmail ? (
            <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" onClick={signOut} title={`Logout ${userEmail}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          ) : (
            <a className="block px-3 py-2 hover:bg-[var(--line)] rounded transition-colors" href="/login">Login</a>
          )}
        </div>
      </details>
    </>
  );
}
