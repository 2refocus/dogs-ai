// components/CommunityFeed.tsx
// Server Component: fetches latest public generations from Supabase and passes to CommunityGrid

import CommunityGrid from "@/components/CommunityGrid";

type Item = {
  id: string;
  url: string;
  created_at: string;
};

async function getItems(): Promise<Item[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Return empty on misconfig; prevents build errors
    return [];
  }

  const endpoint = `${url}/rest/v1/generations` +
    `?select=id,output_url,created_at` +
    `&is_public=eq.true` +
    `&order=created_at.desc` +
    `&limit=24`;

  const res = await fetch(endpoint, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    // avoid caching so homepage stays fresh after uploads
    cache: "no-store",
  });

  if (!res.ok) {
    // Fail soft: log in server console, return empty list
    console.error("CommunityFeed fetch failed", res.status, await res.text().catch(() => ""));
    return [];
  }

  const rows: { id: string; output_url: string | null; created_at: string }[] = await res.json();

  return rows
    .filter(r => typeof r.output_url === "string" && r.output_url)
    .map(r => ({
      id: r.id,
      url: r.output_url as string,
      created_at: r.created_at,
    }));
}

export default async function CommunityFeed() {
  const items = await getItems();
  return <CommunityGrid items={items} />;
}
