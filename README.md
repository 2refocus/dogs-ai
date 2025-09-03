# 🍌 Nano Banana Pet Portraits (Next.js + Replicate)

Fast Next.js app that takes **one dog photo** and returns a **stylized portrait** using **google/nano-banana** on **Replicate**.

### Features
- Single-image upload
- Editable style prompt
- Calls Replicate model and returns output URL
- Vercel-ready; works with the Replicate Integration (uses `REPLICATE_API_TOKEN`)

> Outputs include Google's **SynthID** invisible watermark per Gemini 2.5 Flash Image policy.

## Deploy to Vercel
1. Push this repo to GitHub/GitLab.
2. On Vercel → Project → Settings → Environment Variables:
   - `REPLICATE_API_TOKEN=...`
   - (optional) `NANO_BANANA_VERSION=google/nano-banana:f0a9d34b...`
3. Deploy and open the app.

## Local Dev
```bash
pnpm i   # or npm i / yarn
pnpm dev
```

## Notes
- The API route sends your uploaded image to Replicate as a **data URI** in `image_input`.
- The version is pinned for reproducibility. Remove the suffix to track latest.
- Optional: add Supabase logging to persist runs (not enabled by default).

MIT © 2025
