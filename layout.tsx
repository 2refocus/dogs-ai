import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nano Banana Pet Portrait",
  description: "Upload a pet photo → stylized portrait via google/nano-banana on Replicate.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold">🍌 Nano Banana Pet Portrait</h1>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
