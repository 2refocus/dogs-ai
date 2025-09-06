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
  const [userImages, setUserImages] = useState<any[]>([]);
  const [selectedProfileImage, setSelectedProfileImage] = useState<string>("");
  const [showImageSelector, setShowImageSelector] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      setUser(data.session?.user ?? null);
      if (token) {
        // Get credits
        const creditsRes = await fetch("/api/credits/status", { headers: { Authorization: `Bearer ${token}` } });
        const creditsJson = await creditsRes.json();
        setCredits(creditsJson?.credits ?? 0);

        // Get user profile from generations table (latest entry)
        try {
          const { data: profile } = await supabase
            .from('generations')
            .select('display_name, website')
            .eq('user_id', data.session?.user?.id)
            .not('display_name', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (profile) {
            setDisplayName(profile.display_name || "");
            setWebsite(profile.website || "");
            // Note: profile_image_url column doesn't exist yet, will be added later
          }
        } catch (e) {
          console.log("No profile found, user can set it for the first time");
        }

        // Get all user images for profile selection
        try {
          const { data: images } = await supabase
            .from('generations')
            .select('id, output_url, created_at')
            .eq('user_id', data.session?.user?.id)
            .not('output_url', 'is', null)
            .order('created_at', { ascending: true }); // First image first

          if (images && images.length > 0) {
            setUserImages(images);
            // Set first image as default profile if none selected
            if (!selectedProfileImage) {
              setSelectedProfileImage(images[0].output_url);
            }
          }
        } catch (e) {
          console.log("No images found");
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
      // Update all existing generations for this user with the new profile info
      const { error } = await supabase
        .from('generations')
        .update({
          display_name: displayName || null,
          website: website || null
          // Note: profile_image_url column doesn't exist yet, will be added later
        })
        .eq('user_id', user.id);

      if (error) throw error;
      setMessage("Profile saved successfully! Your name will appear in future generations.");
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
          {/* Profile Image Section - Temporarily disabled until database column is added */}
          <div className="flex items-center gap-4 opacity-50">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[var(--muted)] border-2 border-[var(--line)] flex items-center justify-center">
                <span className="text-[var(--fg)]/50 text-2xl">👤</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--fg)]">
                {displayName || "Profile Picture"}
              </h3>
              <p className="text-sm text-[var(--fg)]/70">
                Coming soon - database update needed
              </p>
            </div>
          </div>

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
