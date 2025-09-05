// components/CommunityFeed.tsx
// Server Component that fetches latest public generations and renders CommunityGrid
// Ensures prop shape matches CommunityGrid's expected { id: string; output_url: string; created_at: string }

import CommunityGrid from "./CommunityGrid";

type Item = {
  id: string;
  output_url: string;
  created_at: string;
};

async function getItems(): Promise<Item[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Env missing: render empty grid rather than breaking the build
    return [];
  }

  const endpoint =
    `${url}/rest/v1/generations` +
    `?select=id,output_url,created_at` +
    `&is_public=eq.true` +
    `&order=created_at.desc` +
    `&limit=24`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
    // If your Supabase project enforces RLS (it should), anon key can still read public rows
  });

  if (!res.ok) {
    // Soft-fail: empty list to keep UI working
    return [];
  }

  const rows = (await res.json()) as any[];

  // Filter out entries without a usable public image URL so the prop type matches CommunityGrid
  const items: Item[] = rows
    .filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        typeof r.output_url === "string" &&
        r.output_url.length > 0
    )
    .map((r) => ({
      id: r.id as string,
      output_url: r.output_url as string,
      created_at: (r.created_at ?? "") as string,
    }));

  return items;
}

export default async function CommunityFeed() {
  const items = await getItems();
  return <CommunityGrid items={items} />;
}
