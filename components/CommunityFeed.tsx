// components/CommunityFeed.tsx
// Server Component that fetches latest public generations and renders CommunityGrid
// Ensures prop shape matches CommunityGrid's expected { id, output_url, created_at }

import CommunityGrid from "./CommunityGrid";

type GenRow = {
  id: string;
  output_url: string | null;
  created_at: string;
};

async function getItems(): Promise<GenRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Env missing: render empty grid rather than breaking the build
    return [];
  }

  const endpoint = `${url}/rest/v1/generations` +
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
  });

  if (!res.ok) {
    // Soft-fail: empty list to keep UI working
    return [];
  }

  const rows = (await res.json()) as any[];
  return rows
    .filter(r => !!r && typeof r.id === "string")
    .map(r => ({
      id: r.id as string,
      output_url: (r.output_url ?? null) as string | null,
      created_at: (r.created_at ?? "") as string,
    }));
}

export default async function CommunityFeed() {
  const items = await getItems();
  // CommunityGrid expects a prop named `items` with fields { id, output_url, created_at }
  return <CommunityGrid items={items} />;
}