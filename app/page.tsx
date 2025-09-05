"use client";

import dynamic from "next/dynamic";
const CommunityFeed = dynamic(() => import("../components/CommunityFeed"), { ssr: true });

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">Homepage</h1>
      {/* Hier dein Generator-UI */}
      <div className="mt-8">
        <hr className="my-6 opacity-20" />
        <CommunityFeed />
      </div>
    </main>
  );
}
