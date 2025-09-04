# Google OAuth (Supabase) — Setup Guide

This app uses **Supabase Auth** with **Google** as an OAuth provider.
Follow these steps to configure Google and connect it to your Supabase project.

## 1) Create a Google Cloud OAuth Client

1. Go to **Google Cloud Console** → APIs & Services → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins** (add both):
   - `http://localhost:3000` (local dev)
   - `https://YOUR-APP.vercel.app` (production)

5. **Authorized redirect URIs** (Supabase handles the callback):
   - `https://YOUR-SUPABASE-PROJECT.supabase.co/auth/v1/callback`

   > Replace `YOUR-SUPABASE-PROJECT` with your **Supabase project ref**.
   > You can find it in **Supabase Dashboard → Project Settings → API** (Project URL).

6. Click **Create** and copy the generated **Client ID** and **Client Secret**.

## 2) Enable Google in Supabase Auth

1. In **Supabase Dashboard** → **Authentication** → **Providers** → **Google**.
2. Paste the **Client ID** and **Client Secret**.
3. Click **Save** and **Enable** the provider.
4. (Optional) Scopes: `openid email profile` (default is fine).

## 3) Environment Variables (already in your app)

In Vercel (or `.env.local` for dev):

```
NEXT_PUBLIC_SUPABASE_URL=...                  # from Supabase Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=...             # from the same place

SUPABASE_URL=...                              # same as NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=...                 # service role key (server only; DO NOT expose to client)
```

No Google keys are needed in your app env — they live in Supabase only.

## 4) How sign-in works in this app

The app calls:
```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: window.location.origin + "/account" }
});
```
Supabase redirects the user to Google, then back to Supabase, which then redirects to your site. The SDK stores the session and exposes an **access token** for API calls.
