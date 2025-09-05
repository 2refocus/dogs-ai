// app/components/CommunityFeed.tsx
// Server component: fetches latest public generations from Supabase and renders a grid

import { createClient } from "@supabase/supabase-js";
import CommunityGrid from "./CommunityGrid";

type Row = {
  id: string;
  output_url: string | null;
  created_at: string;
  prompt?: string | null;
  preset_label?: string | null;
};

export const dynamic = "force-dynamic";

export default async function CommunityFeed({ limit = 12 }: { limit?: number }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return (
      <div className="text-sm opacity-60">
        Community unavailable (missing Supabase env). Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </div>
    );
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("generations")
    .select("id, output_url, created_at, prompt, preset_label")
    .eq("is_public", true)
    .not("output_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return <div className="text-sm opacity-60">Community error: {error.message}</div>;
  }

  return <CommunityGrid items={(data || []) as Row[]} />;
}
