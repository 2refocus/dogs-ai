"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    // If already authenticated, route to dashboard quickly
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        setUser(data.session.user);
        router.replace("/dashboard"); // or "/" if you prefer home
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) router.replace("/dashboard");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [router]);

  const signIn = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined
        }
      });
      // Supabase will handle redirect. No further code here.
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="card grid gap-3">
      <h2 className="text-xl font-semibold">Sign in</h2>
      <p className="opacity-80 text-sm">
        If redirect fails, you will be returned here and routed to your dashboard.
      </p>
      {!user ? (
        <button className="btn" onClick={signIn} disabled={loading}>
          {loading ? "Opening Google…" : "Continue with Google"}
        </button>
      ) : (
        <div className="grid gap-2">
          <p>Signed in as <b>{user.email}</b></p>
          <button className="btn" onClick={() => router.push("/dashboard")}>Go to dashboard</button>
        </div>
      )}
    </main>
  );
}
