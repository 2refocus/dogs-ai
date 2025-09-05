export const dynamic = "force-dynamic";

import dynamic from "next/dynamic";

// Use absolute alias so it works from anywhere in /app
const CommunityFeed = dynamic(() => import("@/components/CommunityFeed"), { ssr: true });

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Community</h1>
      <CommunityFeed />
    </main>
  );
}
