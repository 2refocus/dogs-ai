import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Logo from "@/components/Logo";
import { SITE } from "@/lib/site";

const NavGate = dynamic(() => import("@/components/NavGate"), { ssr: false });

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.subtitle,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="mb-6 navbar relative">
            <a href="/" className="brand">
              <Logo variant={SITE.logo} className="logo-mark" />
              <div>
                <div className="brand-title">{SITE.title}</div>
                <div className="brand-sub">{SITE.subtitle}</div>
              </div>
            </a>
            <NavGate />
          </header>
          {children}
          <footer className="mt-16 opacity-60 text-sm">
            Note: Outputs may include Google’s invisible SynthID watermark.
          </footer>
        </div>
      </body>
    </html>
  );
}
