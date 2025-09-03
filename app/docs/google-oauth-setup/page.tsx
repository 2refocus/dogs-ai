import fs from "node:fs";
import path from "node:path";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Google OAuth Setup" };

export default function Page() {
  const file = path.join(process.cwd(), "docs", "google-oauth-setup.md");
  const content = fs.readFileSync(file, "utf-8");
  return (
    <main className="card">
      <article className="prose prose-invert max-w-none whitespace-pre-wrap">{content}</article>
    </main>
  );
}
