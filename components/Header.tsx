"use client";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight">my Pet Portrait Studio</a>

        <nav className="hidden md:flex items-center gap-4">
          <a href="/bundles" className="hover:underline">Bundles</a>
          <a href="/history" className="hover:underline">History</a>
          <a href="/login" className="hover:underline">Login</a>
        </nav>

        <button
          className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded border"
          onClick={() => setOpen(v => !v)}
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="md:hidden z-50 border-t bg-background">
          <nav className="mx-auto max-w-5xl px-4 py-3 grid gap-2">
            <a className="py-1" href="/bundles">Bundles</a>
            <a className="py-1" href="/history">History</a>
            <a className="py-1" href="/login">Login</a>
          </nav>
        </div>
      )}
    </header>
  );
}