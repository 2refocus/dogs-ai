/* components/NavBar.tsx */
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  // close on route change (optional safeguard if you have next/navigation)
  useEffect(() => {
    const handler = () => setOpen(false);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0d1015]/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Pet Portrait Studio <span className="text-amber-400">*</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop nav (>= md) */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/" className="hover:text-amber-300">Home</Link>
          <Link href="/bundles" className="hover:text-amber-300">Bundles</Link>
          <Link href="/history" className="hover:text-amber-300">History</Link>
          <Link href="/login" className="hover:text-amber-300">Login</Link>
        </nav>

        {/* Mobile hamburger (< md) */}
        <button
          type="button"
          className="md:hidden rounded-lg border border-white/10 px-2 py-1 text-sm hover:bg-white/5"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#0d1015]">
          <div className="mx-auto max-w-6xl px-4 py-3 grid gap-2 text-sm">
            <Link href="/" className="hover:text-amber-300">Home</Link>
            <Link href="/bundles" className="hover:text-amber-300">Bundles</Link>
            <Link href="/history" className="hover:text-amber-300">History</Link>
            <Link href="/login" className="hover:text-amber-300">Login</Link>
          </div>
        </div>
      )}
    </header>
  );
}
