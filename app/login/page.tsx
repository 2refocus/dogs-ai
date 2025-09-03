"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async () => {
    setLoading(true);
    try { await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } }); }
    finally { setLoading(false); }
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <main className="card grid gap-3">
      <h2 className="text-xl font-semibold">Sign in</h2>
      {!user ? (
        <button className="btn" onClick={signIn} disabled={loading}>{loading ? "Opening Google…" : "Continue with Google"}</button>
      ) : (
        <div className="grid gap-2">
          <p>Signed in as <b>{user.email}</b></p>
          <button className="btn" onClick={signOut}>Sign out</button>
        </div>
      )}
      <p className="opacity-80 text-sm">After sign-in, you can purchase bundles and keep your history.</p>
    </main>
  );
}
