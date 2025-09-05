/* app/history/page.tsx — guest history + community */
"use client";

import { useEffect, useState } from "react";
import { readLocal } from "@/lib/localHistory";
import CommunityFeed from "@/components/CommunityFeed";

type Item = { output_url: string; created_at?: string };

export default function HistoryPage() {
  const [local, setLocal] = useState<Item[]>([]);

  useEffect(() => {
    setLocal(readLocal());
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6 grid gap-8">
      <section>
        <h1 className="text-xl font-bold mb-3">Your History</h1>
        {local.length === 0 ? (
          <p className="opacity-60">
            Nothing yet. Generate your first portrait on the home page.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {local.map((it, idx) => (
              <div
                key={idx}
                className="rounded-lg overflow-hidden border border-white/10 bg-white/2"
                title={it.created_at || ""}
              >
                <img
                  src={it.output_url}
                  alt="your generation"
                  className="w-full h-full object-cover aspect-square"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Community</h2>
        <CommunityFeed />
      </section>
    </main>
  );
}
