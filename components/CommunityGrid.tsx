"use client";

type Item = { id?: string | number; output_url: string; created_at?: string };

export default function CommunityGrid({ items }: { items: Item[] }) {
  if (!items || items.length === 0) {
    return <p className="text-sm opacity-60">No public images yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((it, idx) => (
        <div
          key={String(it.id ?? idx)}
          className="rounded-lg overflow-hidden border border-white/10 bg-white/2"
          title={it.created_at || ""}
        >
          <img
            src={it.output_url}
            alt="community"
            className="w-full h-full object-cover aspect-square"
          />
        </div>
      ))}
    </div>
  );
}
