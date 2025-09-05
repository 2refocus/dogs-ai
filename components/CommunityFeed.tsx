'use client';

// Minimal wrapper that just renders the grid.
// IMPORTANT: fixed the import path to use "@/components/CommunityGrid"
// (it previously pointed to "@/app/components/CommunityGrid" which doesn't exist)
import CommunityGrid from "@/components/CommunityGrid";

export default function CommunityFeed() {
  return <CommunityGrid />;
}
