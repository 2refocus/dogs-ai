import CommunityGrid from "@/app/components/CommunityGrid";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Row = {
  id: string;
  output_url: string | null;
  prompt?: string | null;
  is_public?: boolean | null;
  created_at?: string | null;
};

export default async function CommunityFeed() {
  if (!url || !anon) {
    return <div className="text-sm opacity-60">Supabase not configured.</div>;
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  // Prefer is_public = true if column exists; otherwise just select last 24
  // We can't know columns at runtime easily here, so try is_public and fall back if it errors.
  let data: Row[] = [];
  try {
    const { data: rows, error } = await supabase
      .from("generations")
      .select("id, output_url, prompt, is_public, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    data = rows || [];
  } catch {
    const { data: rows2 } = await supabase
      .from("generations")
      .select("id, output_url, prompt, created_at")
      .order("created_at", { ascending: false })
      .limit(24);
    data = rows2 || [];
  }

  const items = (data || []).filter((r) => !!r.output_url).map((r) => ({
    id: r.id,
    output_url: r.output_url as string,
    prompt: r.prompt || null,
    created_at: r.created_at || null,
  }));

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Community</h2>
        <a className="text-sm underline opacity-80 hover:opacity-100" href="/community">See all</a>
      </div>
      <CommunityGrid items={items} />
    </section>
  );
}
