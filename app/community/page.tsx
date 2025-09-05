export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";

// Use absolute alias so it works from anywhere in /app
const CommunityFeed = dynamicImport(() => import("@/components/CommunityFeed"), { ssr: true });

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <CommunityFeed />
    </main>
  );
}
