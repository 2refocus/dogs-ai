# 🍌 Nano Banana Pet Portraits — Before/After + Auth UI

What's included:
- Before/After slider component
- 1 free generation per browser (localStorage gating)
- Supabase Google sign-in page (`/login`) and bundles UI (`/bundles`) to prepare for credits

Set env:
- `REPLICATE_API_TOKEN` (required)
- `NANO_BANANA_VERSION` (optional pinned model version)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for OAuth)

Next steps (server features):
- Add Supabase tables for user credits + RLS
- Wire Stripe checkout → webhook adds credits
- Server-side enforcement: check credits before call, decrement after success
