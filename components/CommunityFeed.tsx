// app/components/CommunityFeed.tsx
import CommunityGrid, { CommunityItem } from "./CommunityGrid";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60; // refresh SSG every 60s

type Row = {
  id: string;
  output_url: string | null;
  prompt?: string | null;
  preset_label?: string | null;
  created_at?: string | null;
};

export default async function CommunityFeed({ limit = 24 }: { limit?: number }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return (
      <div className="text-sm opacity-70">
        Community unavailable (missing Supabase env). Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </div>
    );
  }

  const supabase = createClient(url, anon);

  // Only public images; tolerate schema differences (older DBs without is_public)
  let rows: Row[] = [];
  const q = supabase
    .from("generations")
    .select("id, output_url, prompt, preset_label, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await q.eq("is_public", true);
  if (error) {
    // try without is_public if column not present
    const fallback = await supabase
      .from("generations")
      .select("id, output_url, prompt, preset_label, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (fallback.data) rows = fallback.data as unknown as Row[];
  } else if (data) {
    rows = data as unknown as Row[];
  }

  const items: CommunityItem[] = (rows || [])
    .filter((r) => r.output_url)
    .map((r) => ({
      id: r.id,
      url: r.output_url as string,
      prompt: r.prompt ?? null,
      label: r.preset_label ?? null,
      createdAt: r.created_at ?? null,
    }));

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">Latest from the community</h2>
      <CommunityGrid items={items} />
    </section>
  );
}
