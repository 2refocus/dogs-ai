// app/community/page.tsx — dedicated Community page (optional)
import CommunityFeed from "../components/CommunityFeed";

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-6xl p-6 grid gap-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Community</h1>
        <span className="text-xs opacity-60">Latest public generations</span>
      </div>
      <CommunityFeed limit={24} />
    </main>
  );
}
