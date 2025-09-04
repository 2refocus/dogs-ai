-- Give users the ability to delete their own generations
alter table public.generations enable row level security;

do $$ begin
  create policy "delete own generations"
    on public.generations for delete
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- OPTIONAL: auto-delete rows older than 30 days using pg_cron
-- Enable extension (requires Owner role; enabled in most Supabase projects)
create extension if not exists pg_cron;

-- Create a daily cron job at 02:15 UTC to purge old rows
-- You can change schedule: '15 2 * * *' = 02:15 every day
select
  cron.schedule('purge_old_generations',
                '15 2 * * *',
                $$
                delete from public.generations
                where created_at < now() - interval '30 days';
                $$);

-- If job exists, you can update it with cron.alter_job schedule or drop and re-create:
-- select cron.unschedule('purge_old_generations');
