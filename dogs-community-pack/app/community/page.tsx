// app/community/page.tsx
import CommunityGrid from "../components/CommunityGrid";

export const revalidate = 60;

type Row = {
  id: string;
  output_url: string | null;
  preset_label?: string | null;
  created_at: string;
};

async function getAllPublic(): Promise<Row[]> {
  const urlBase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url =
    `${urlBase}/rest/v1/generations` +
    `?select=id,output_url,preset_label,created_at` +
    `&is_public=eq.true&order=created_at.desc&limit=120`;

  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("Community page fetch failed", await res.text());
    return [];
  }
  return (await res.json()) as Row[];
}

export default async function CommunityPage() {
  const rows = await getAllPublic();

  return (
    <main className="container grid gap-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Community</h1>
        <a href="/" className="text-sm underline opacity-80 hover:opacity-100">
          ← Back to generator
        </a>
      </div>
      <CommunityGrid rows={rows} />
    </main>
  );
}
