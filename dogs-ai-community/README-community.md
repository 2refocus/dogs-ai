# Community Uploads Setup

## SQL for `generations` table

```sql
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  input_url text,
  output_url text,
  prompt text,
  preset_label text,
  is_public boolean default true,
  created_at timestamp with time zone default now()
);

alter table public.generations enable row level security;

-- Allow anyone to read public generations
create policy "Read public generations"
  on public.generations for select
  using ( is_public = true );

-- Allow inserts (anon users can insert rows)
create policy "Insert generations"
  on public.generations for insert
  with check ( true );
```

## Storage bucket

In Supabase dashboard → Storage, create a bucket named `generations`.

Add policy for `generations` bucket:
- Public read for objects under `public/*`
- Public insert for `public/*`

## Env vars

In Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_STORAGE_BUCKET=generations
REPLICATE_API_TOKEN=...
REPLICATE_MODEL=google/nano-banana
```

⚠️ Do **not** set `REPLICATE_VERSION` if you’re calling the model endpoint directly.
```