-- Create saved_menus table
create table if not exists saved_menus (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  report_id uuid references lab_reports not null,
  created_at timestamptz default now(),
  unique(user_id, report_id)
);

-- Enable RLS
alter table saved_menus enable row level security;

-- RLS Policies
create policy "Users can view their own saved menus" 
  on saved_menus for select 
  using (auth.uid() = user_id);

create policy "Users can save menus" 
  on saved_menus for insert 
  with check (auth.uid() = user_id);

create policy "Users can unsave menus" 
  on saved_menus for delete 
  using (auth.uid() = user_id);
