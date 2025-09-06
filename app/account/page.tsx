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
            .select('display_name, website, profile_image_url')
            .eq('user_id', data.session?.user?.id)
            .not('display_name', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (profile) {
            setDisplayName(profile.display_name || "");
            setWebsite(profile.website || "");
            setSelectedProfileImage(profile.profile_image_url || "");
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

  // Separate function to save profile image
  async function saveProfileImage(imageUrl: string) {
    if (!user) return;
    
    // Get fresh session to ensure we have the correct user ID
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;
    
    // Validate user ID format
    if (!currentUserId || typeof currentUserId !== 'string') {
      console.error("Invalid user ID:", currentUserId);
      setMessage("Error: Invalid user ID");
      return;
    }
    
    try {
      console.log("Saving profile image for user:", currentUserId);
      console.log("Image URL:", imageUrl);
      
      // First, clear all existing profile image URLs for this user
      const { error: clearError } = await supabase
        .from('generations')
        .update({
          profile_image_url: null
        })
        .eq('user_id', currentUserId);

      if (clearError) {
        console.error("Clear error:", clearError);
        throw clearError;
      }

      // Then, set the profile image URL only on the record that matches the selected image
      const { error: setError } = await supabase
        .from('generations')
        .update({
          profile_image_url: imageUrl
        })
        .eq('user_id', currentUserId)
        .eq('output_url', imageUrl);

      if (setError) {
        console.error("Set error:", setError);
        throw setError;
      }
      
      console.log("Profile image saved successfully");
      console.log("Updated record with profile_image_url:", imageUrl);
      
      // Show success message and refresh data
      setMessage("Profile image updated successfully!");
      
      // Refresh the history page if it's open
      if (window.location.pathname === '/history') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error saving profile image:", error);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="bg-[var(--muted)] rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-[var(--fg)]">Your Account</h2>
        
        <div className="grid gap-6">
          {/* Profile Image Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {selectedProfileImage ? (
                <img
                  src={selectedProfileImage}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[var(--line)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[var(--muted)] border-2 border-[var(--line)] flex items-center justify-center">
                  <span className="text-[var(--fg)]/50 text-2xl">👤</span>
                </div>
              )}
              {userImages.length > 0 && (
                <button
                  onClick={() => setShowImageSelector(!showImageSelector)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--brand)] text-[var(--brand-ink)] rounded-full flex items-center justify-center text-xs font-bold hover:bg-[var(--brand)]/90 transition-colors"
                  title="Change profile image"
                >
                  ✏️
                </button>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--fg)]">
                {displayName || "Profile Picture"}
              </h3>
              <p className="text-sm text-[var(--fg)]/70">
                {userImages.length > 0 
                  ? "Click the edit button to choose from your generated images"
                  : "Generate some images first to set a profile picture"
                }
              </p>
            </div>
          </div>

          {/* Image Selector */}
          {showImageSelector && userImages.length > 0 && (
            <div className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--line)]">
              <h4 className="text-sm font-semibold text-[var(--fg)] mb-3">Choose Profile Image</h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {userImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      setSelectedProfileImage(image.output_url);
                      setShowImageSelector(false);
                      // Save the profile image immediately
                      saveProfileImage(image.output_url);
                    }}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      selectedProfileImage === image.output_url
                        ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/20'
                        : 'border-[var(--line)] hover:border-[var(--brand)]/50'
                    }`}
                  >
                    <img
                      src={image.output_url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                        First
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

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
