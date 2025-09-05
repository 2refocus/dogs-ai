"use client";
import CommunityGrid from "@/components/CommunityGrid";

export default function CommunityFeed() {
  // If CommunityGrid already does its own fetching, this just renders it.
  // Otherwise, replace with a fetch to Supabase and pass items as props.
  return <CommunityGrid />;
}
