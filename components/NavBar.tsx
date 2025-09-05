"use client";
import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="w-full border-b p-4 flex justify-between items-center bg-white z-50 relative">
      <Link href="/" className="font-bold text-lg">Pet Portraits</Link>
      <div className="hidden md:flex gap-4">
        <Link href="/history" className="hover:underline">History</Link>
        <Link href="/community" className="hover:underline">Community</Link>
      </div>
    </nav>
  );
}
