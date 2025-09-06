"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import LogoDog from "@/components/LogoDog";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    // If already authenticated, route to dashboard quickly
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        setUser(data.session.user);
        router.replace("/dashboard");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) router.replace("/dashboard");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [router]);

  const signInWithOAuth = async (provider: "google" | "github" | "apple") => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async () => {
    if (!email) return;
    setEmailLoading(true);
    try {
      // Use signInWithOtp for both sign-in and sign-up (magic link)
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/dashboard" : undefined
        }
      });
    } finally {
      setEmailLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--muted)] p-8 text-center">
            <p className="text-[var(--fg)] mb-4">Signed in as <b>{user.email}</b></p>
            <button 
              className="w-full rounded-xl bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-[var(--brand-ink)] px-6 py-3 font-semibold transition-all"
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoDog className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Pet Portrait Studio</h1>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--muted)] p-8">
          <h2 className="text-xl font-semibold text-[var(--fg)] mb-6 text-center">Sign in</h2>
          
          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--fg)] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--fg)] placeholder:text-[var(--fg)]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
            />
          </div>

          {/* Continue Button */}
          <button
            onClick={signInWithEmail}
            disabled={emailLoading || !email}
            className="w-full rounded-xl bg-white hover:bg-gray-50 text-black px-6 py-3 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {emailLoading ? "Sending magic link..." : "Continue"}
          </button>

          {/* Separator */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--line)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--muted)] text-[var(--fg)]/60">OR</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => signInWithOAuth("google")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-4 py-3 font-medium transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => signInWithOAuth("github")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-4 py-3 font-medium transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>

            <button
              onClick={() => signInWithOAuth("apple")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-4 py-3 font-medium transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <span className="text-[var(--fg)]/70">Don't have an account? </span>
            <span className="text-[var(--brand)] font-medium">
              Use the same email above
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
