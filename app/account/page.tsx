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

  if (!user) return <main className="card">Please <a className="link" href="/login">sign in</a>.</main>;

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
      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold mb-6">Your Account</h2>
        
        <div className="grid gap-6">
          <div>
            <p className="mb-1">Email</p>
            <p className="text-lg font-medium">{user.email}</p>
          </div>

          <div>
            <p className="mb-1">Credits Available</p>
            <p className="text-lg font-medium">{credits ?? "…"}</p>
          </div>

          <hr className="border-white/10" />

          <div className="grid gap-4">
            <h3 className="text-lg font-medium">Profile Settings</h3>
            
            <div className="grid gap-2">
              <label className="text-sm">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                placeholder="How you'll appear in the community"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm">Website or Social Media</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between mt-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-black disabled:opacity-50"
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
