import "./globals.css";
import type { Metadata } from "next";
import NavGate from "@/components/NavGate";

export const metadata: Metadata = {
  title: "Pet Portrait Studio",
  description: "Stylized dog & cat portraits with Nano Banana on Replicate",
  viewport: { width: "device-width", initialScale: 1, maximumScale: 1 },
  other: { "color-scheme": "dark light" }
};

const BUILD_TAG = process.env.NEXT_PUBLIC_BUILD_TAG || "ui-patch-" + new Date().toISOString().slice(0,16).replace(/[:T]/g, "").slice(0,12);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="container" style={{ paddingTop: '1rem' }}>
          <div className="navbar">
            <a href="/" className="brand" aria-label="Home">
              <svg className="logo-mark" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7 14c1.2 1.4 3 2.2 5 2.2S15.8 15.4 17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div>
                <div className="brand-title">Pet Portrait Studio</div>
                <div className="brand-sub">Elegant & cozy styles for pets</div>
              </div>
            </a>
            <NavGate />
          </div>
        </header>
        <main className="container" style={{ paddingTop: '0.5rem', paddingBottom: '3rem' }}>
          {children}
        </main>
        <footer className="container" style={{ paddingBottom: '2rem', opacity:.7, fontSize:'.85rem', display:'flex', justifyContent:'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Made with ❤️</span>
          <span style={{ opacity:.65 }}>build: <code>{BUILD_TAG}</code></span>
        </footer>
      </body>
    </html>
  );
}
