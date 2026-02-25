-- 1. Create lab_likes table
create table if not exists lab_likes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  report_id uuid references lab_reports not null,
  created_at timestamptz default now(),
  unique(user_id, report_id)
);

-- 2. Create lab_comments table
create table if not exists lab_comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  report_id uuid references lab_reports not null,
  content text not null,
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table lab_likes enable row level security;
alter table lab_comments enable row level security;

-- 4. RLS Policies for Likes
create policy "Everyone can view likes" on lab_likes for select using (true);
create policy "Users can like posts" on lab_likes for insert with check (auth.uid() = user_id);
create policy "Users can remove likes" on lab_likes for delete using (auth.uid() = user_id);

-- 5. RLS Policies for Comments
create policy "Everyone can view comments" on lab_comments for select using (true);
create policy "Users can post comments" on lab_comments for insert with check (auth.uid() = user_id);
-- Only allow users to delete their own comments
create policy "Users can delete own comments" on lab_comments for delete using (auth.uid() = user_id);

-- 6. Realtime setup instructions (Reminder for Dashboard)
-- You must enable Realtime for 'lab_likes' and 'lab_comments' in the Supabase Dashboard > Database > Replication.
