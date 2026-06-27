-- Create table for storing call history and metadata
create table if not exists public.calls (
  id uuid default gen_random_uuid() primary key,
  caller_number text,
  agent_name text not null,
  language text not null,
  duration_seconds integer default 0,
  sentiment text check (sentiment in ('Positive', 'Neutral', 'Negative')),
  transcript text,
  recording_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: Ensure you create a Storage Bucket named "recordings" in your Supabase console:
-- 1. Go to Supabase Storage -> New Bucket
-- 2. Name: recordings
-- 3. Set it to Public (or configure appropriate RLS policies for uploads/reads)
