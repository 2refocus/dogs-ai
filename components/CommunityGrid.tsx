// app/components/CommunityGrid.tsx
// Server component: simple presentational grid for community images
type Row = {
  id: string;
  output_url: string | null;
  created_at: string;
  prompt?: string | null;
  preset_label?: string | null;
};

export default function CommunityGrid({ items }: { items: Row[] }) {
  if (!items || items.length === 0) {
    return <div className="text-sm opacity-60">No community images yet. Be the first to generate one!</div>;
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((r) => (
        <li
          key={r.id}
          className="rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-square"
          title={r.preset_label || r.prompt || ""}
        >
          {r.output_url ? (
            <img
          src={r.output_url}
          alt={r.preset_label || r.prompt || "Community image"}
          className="w-full h-full object-cover"
        />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs opacity-60">Processing…</div>
          )}
        </li>
      ))}
    </ul>
  );
}
