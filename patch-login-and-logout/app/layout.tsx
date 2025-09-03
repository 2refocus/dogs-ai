import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const NavGate = dynamic(() => import("@/components/NavGate"), { ssr: false });

export const metadata: Metadata = {
  title: "Nano Banana Pet Portrait",
  description: "Upload a pet photo → stylized portrait via google/nano-banana on Replicate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold">🍌 Nano Banana Pet Portrait</h1>
            <NavGate />
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
