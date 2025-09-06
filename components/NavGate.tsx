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
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', position: 'relative' }}>
  

      {/* Top bar (single nav). If you already render a global header, you can delete this block. */}
      <header className="mb-6 flex items-center justify-between gap-3">
        
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
        {/* mobile burger */}
        <details className="md:hidden relative">
          <summary className="list-none cursor-pointer rounded-xl border border-[var(--line)] px-3 py-2 bg-[var(--muted)] hover:bg-[var(--line)] transition-colors">☰</summary>
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--line)] bg-[var(--muted)] backdrop-blur p-2 z-50 shadow-lg">
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
  
   


      </header>

      {/* Menu toggle (kept for secondary navigation) */}
      {/* <button className="burger" onClick={() => setOpen(v => !v)} aria-expanded={isOpen} aria-haspopup="menu" title="Menu">
        ☰
      </button> */}

      {isOpen && (
        <div className="menu-panel" role="menu">
          <a className="menu-item" href="/">Home</a>
          <a className="menu-item" href="/dashboard">Dashboard</a>
          <a className="menu-item" href="/history">History</a>
          <a className="menu-item" href="/bundles">Buy bundles</a>
          <a className="menu-item" href="/settings">Settings</a>
          {userEmail ? (
            <button className="menu-item btn-outline" onClick={signOut}>Logout <span style={{ opacity:.7, marginLeft: 6 }}>({userEmail})</span></button>
          ) : (
            <a className="menu-item" href="/login">Login</a>
          )}
        </div>
      )}
    </div>
  );
}
