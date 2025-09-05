"use client";
import Image from "next/image";

type Item = {
  id: string | number;
  output_url: string;
  prompt?: string | null;
  created_at?: string | null;
};

export default function CommunityGrid({ items }: { items: Item[] }) {
  if (!items?.length) {
    return (
      <div className="text-sm opacity-60">No public images yet.</div>
    );
  }
  return (
    <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((it) => (
        <li key={it.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/2">
          <div className="relative aspect-square">
            {/* next/image for automatic sizing */}
            <Image
              src={it.output_url}
              alt={it.prompt || "community image"}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
              className="object-cover"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
