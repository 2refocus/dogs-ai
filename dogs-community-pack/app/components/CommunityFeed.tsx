// app/components/CommunityFeed.tsx
import CommunityGrid from "./CommunityGrid";

export const revalidate = 60; // cache 60s on the server

type Row = {
  id: string;
  output_url: string | null;
  preset_label?: string | null;
  created_at: string;
};

async function getPublicGenerations(): Promise<Row[]> {
  const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url =
    `${urlBase}/rest/v1/generations` +
    `?select=id,output_url,preset_label,created_at` +
    `&is_public=eq.true&order=created_at.desc&limit=24`;

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("CommunityFeed fetch failed", await res.text());
    return [];
  }
  return (await res.json()) as Row[];
}

export default async function CommunityFeed() {
  const rows = await getPublicGenerations();

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Community</h2>
        <a href="/community" className="text-sm underline opacity-80 hover:opacity-100">
          See all →
        </a>
      </div>
      <CommunityGrid rows={rows} />
    </section>
  );
}
