import CommunityFeed from "@/app/components/CommunityFeed";

export const metadata = {
  title: "Community",
};

export default function CommunityPage() {
  // This page is a thin wrapper around the feed
  return (
    <main className="mx-auto max-w-6xl p-6">
      <CommunityFeed />
    </main>
  );
}
