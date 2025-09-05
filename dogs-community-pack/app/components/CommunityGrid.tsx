// app/components/CommunityGrid.tsx
'use client';

type Row = {
  id: string;
  output_url: string | null;
  preset_label?: string | null;
  created_at: string;
};

export default function CommunityGrid({ rows }: { rows: Row[] }) {
  if (!rows?.length) {
    return (
      <div className="text-sm opacity-70">
        No shared portraits yet.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {rows.map((r) => (
        <li key={r.id} className="overflow-hidden rounded-xl border bg-background">
          <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
            {r.output_url ? (
              <img
                src={r.output_url}
                alt={r.preset_label || 'Community portrait'}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
          <div className="px-3 py-2 text-xs opacity-70">
            {r.preset_label || 'Shared portrait'}
          </div>
        </li>
      ))}
    </ul>
  );
}
