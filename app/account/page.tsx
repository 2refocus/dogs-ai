"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      setUser(data.session?.user ?? null);
      if (token) {
        // Get credits
        const creditsRes = await fetch("/api/credits/status", { headers: { Authorization: `Bearer ${token}` } });
        const creditsJson = await creditsRes.json();
        setCredits(creditsJson?.credits ?? 0);

        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, website')
          .eq('user_id', data.session?.user?.id)
          .single();

        if (profile) {
          setDisplayName(profile.display_name || "");
          setWebsite(profile.website || "");
        }
      }
    });
  }, []);

  if (!user) return <main className="card"><p className="text-[var(--fg)]">Please <a className="link text-[var(--brand)] hover:text-[var(--brand)]/80" href="/login">sign in</a>.</p></main>;

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
          website: website,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setMessage("Profile saved successfully!");
    } catch (error: any) {
      setMessage("Error saving profile: " + (error.message || "Please try again"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="bg-[var(--muted)] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-[var(--fg)]">Your Account</h2>
        
        <div className="grid gap-6">
          <div>
            <p className="mb-1 text-[var(--fg)]/70">Email</p>
            <p className="text-lg font-medium text-[var(--fg)]">{user.email}</p>
          </div>

          <div>
            <p className="mb-1 text-[var(--fg)]/70">Credits Available</p>
            <p className="text-lg font-medium text-[var(--fg)]">{credits ?? "…"}</p>
          </div>

          <hr className="border-[var(--line)]" />

          <div className="grid gap-4">
            <h3 className="text-lg font-medium text-[var(--fg)]">Profile Settings</h3>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--fg)]">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--muted)] text-[var(--fg)] placeholder:text-[var(--fg)]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
                placeholder="How you'll appear in the community"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[var(--fg)]">Website or Social Media</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--muted)] text-[var(--fg)] placeholder:text-[var(--fg)]/50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-[var(--brand)] hover:bg-[var(--brand)]/90 text-[var(--brand-ink)] px-6 py-3 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              {message && (
                <p className={message.includes("Error") ? "text-red-400" : "text-green-400"}>
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
