import "./globals.css";
import type { Metadata } from "next";
import NavGate from "@/components/NavGate";
import LogoDog from "@/components/LogoDog";
import { site } from "@/site";

export const metadata: Metadata = {
  title: site.name,
  description: site.description,
  metadataBase: new URL(site.url),
  other: { "color-scheme": site.meta.colorScheme },
  themeColor: site.meta.themeColor,
};

const BUILD_TAG = process.env.NEXT_PUBLIC_BUILD_TAG || "ui";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Boot loading style settings early */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var s = localStorage.getItem('loadingStyle') || 'pattern';
              var sp = localStorage.getItem('loadingSpeed') || 'normal';
              document.documentElement.setAttribute('data-loading-style', s);
              document.documentElement.setAttribute('data-skeleton-speed', sp);
            }catch(e){}})();`
          }}
        />
      </head>
      <body>
        <header className="container" style={{ paddingTop: '1rem' }}>
          <div className="navbar">
            <a href="/" className="brand" aria-label="Home">
              <LogoDog className="logo-mark" />
              <div>
                <div className="brand-title">{site.name}</div>
                <div className="brand-sub">{site.tagline}</div>
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
