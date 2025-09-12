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

  const signInWithOAuth = async (provider: "google" | "twitter" | "linkedin" | "facebook") => {
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
       {/*} <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <LogoDog className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--fg)]">Pet Portrait Studio</h1>
        </div>*/}

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

            {/* GitHub temporarily disabled
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
            */}

            <button
              onClick={() => signInWithOAuth("twitter")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-4 py-3 font-medium transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Continue with X (Twitter)
            </button>

            {/* LinkedIn temporarily disabled
            <button
              onClick={() => signInWithOAuth("linkedin")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-4 py-3 font-medium transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Continue with LinkedIn
            </button>
            */

            <button
              onClick={() => signInWithOAuth("facebook")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--line)]/10 text-[var(--fg)] px-4 py-3 font-medium transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
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
