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
    // Optional: keep free count the same; but clear any transient UI state
    sessionStorage.clear();
    // Ensure we land on the creator
    window.location.href = "/";
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="burger" onClick={() => setOpen(v => !v)} aria-expanded={isOpen} aria-haspopup="menu">
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
