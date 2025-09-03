import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nano Banana Pet Portrait",
  description: "Upload a pet photo → stylized portrait via google/nano-banana on Replicate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="mb-8 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">🍌 Nano Banana Pet Portrait</h1>
              <p className="opacity-80 text-sm">One free portrait · then buy bundles</p>
            </div>
            <nav className="flex items-center gap-3">
              <Link className="btn" href="/login">Sign in</Link>
              <Link className="btn" href="/bundles">Buy bundles</Link>
            </nav>
          </header>
          {children}
          <footer className="mt-16 opacity-60 text-sm">
            Note: Outputs include Google’s invisible SynthID watermark.
          </footer>
        </div>
      </body>
    </html>
  );
}
