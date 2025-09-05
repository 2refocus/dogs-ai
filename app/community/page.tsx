// app/community/page.tsx
import CommunityFeed from "../components/CommunityFeed";

export const dynamic = "force-static";
export const revalidate = 60;

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-6xl p-6 grid gap-6">
      <h1 className="text-2xl font-semibold">Community</h1>
      <CommunityFeed limit={60} />
    </main>
  );
}
