"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
      {/* Quick actions: Settings + Logout (if authed) or Login */}
      <a href="/settings" className="icon-btn" title="Settings" aria-label="Settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.69 0 1.33-.39 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.48.48 1.18.62 1.82.33.61-.18 1-.82 1-1.51V3a2 2 0 1 1 4 0v.09c0 .69.39 1.33 1 1.51.64.29 1.34.15 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.48.48-.62 1.18-.33 1.82.18.61.82 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.69 0-1.33.39-1.51 1z"/>
        </svg>
      </a>

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

      {/* Menu toggle (kept for secondary navigation) */}
      <button className="burger" onClick={() => setOpen(v => !v)} aria-expanded={isOpen} aria-haspopup="menu" title="Menu">
        ☰
      </button>

      {isOpen && (
        <div className="menu-panel" role="menu">
          <a className="menu-item" href="/">Home</a>
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
