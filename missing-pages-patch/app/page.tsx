"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="grid gap-6">
      <section className="card grid gap-3">
        <h2 className="text-xl font-semibold">Welcome</h2>
        <p className="opacity-80">
          This is the home page. If you already have a generation UI, keep it here. Otherwise, use the links below.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn" href="/dashboard">Dashboard</Link>
          <Link className="btn" href="/bundles">Buy bundles</Link>
          <Link className="btn" href="/history">History</Link>
          <Link className="btn" href="/receipts">Receipts</Link>
          <Link className="btn" href="/login">Login</Link>
        </div>
      </section>
    </main>
  );
}
