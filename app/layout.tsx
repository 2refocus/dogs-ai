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
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: '/icon.png',
  },
};

const BUILD_TAG = process.env.NEXT_PUBLIC_BUILD_TAG || "ui";
const DEFAULT_STYLE = process.env.NEXT_PUBLIC_DEFAULT_LOADING_STYLE || "shimmer";
const DEFAULT_SPEED = process.env.NEXT_PUBLIC_DEFAULT_LOADING_SPEED || "normal";
const DEFAULT_AR = process.env.NEXT_PUBLIC_DEFAULT_ASPECT_RATIO || "1:1"; // square by default

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Boot settings early to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var ds = ${JSON.stringify(DEFAULT_STYLE)};
              var dp = ${JSON.stringify(DEFAULT_SPEED)};
              var dar = ${JSON.stringify(DEFAULT_AR)};
              var s = localStorage.getItem('loadingStyle') || ds;
              var sp = localStorage.getItem('loadingSpeed') || dp;
              var ar = localStorage.getItem('aspectRatio') || dar;
              document.documentElement.setAttribute('data-loading-style', s);
              document.documentElement.setAttribute('data-skeleton-speed', sp);
              document.documentElement.setAttribute('data-aspect-ratio', ar);
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
