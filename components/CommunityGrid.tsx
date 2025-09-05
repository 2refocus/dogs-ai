// app/components/CommunityGrid.tsx
import Image from "next/image";

export type CommunityItem = {
  id: string;
  url: string;
  prompt?: string | null;
  label?: string | null;
  createdAt?: string | null;
};

export default function CommunityGrid({ items }: { items: CommunityItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-sm opacity-70">
        No community images yet. Be the first to generate one!
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map((it) => (
        <li key={it.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
          <div className="relative aspect-square">
            {/* Next/Image keeps layout stable while loading */}
            <Image
              src={it.url}
              alt={it.label || it.prompt || "community image"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
              unoptimized
            />
          </div>
          {(it.label || it.createdAt) && (
            <div className="p-2 grid gap-1">
              {it.label && <div className="text-xs font-medium line-clamp-1">{it.label}</div>}
              {it.createdAt && (
                <div className="text-[10px] opacity-60">
                  {new Date(it.createdAt).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
