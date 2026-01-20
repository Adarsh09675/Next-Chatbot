-- Create a specific profiles table for this app to avoid conflicts with other apps in the same project
create table if not exists public.chatbot_profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.chatbot_profiles enable row level security;

-- Create policies (only allow users to view/edit their own profile)
create policy "Users can view own chatbot profile" 
  on public.chatbot_profiles for select 
  using (auth.uid() = id);

create policy "Users can update own chatbot profile" 
  on public.chatbot_profiles for update 
  using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_chatbot_user() 
returns trigger as $$
begin
  -- Only create a profile if the user has the 'my-chatbot' app metadata
  -- This ensures users from other apps don't clutter this table
  if new.raw_user_meta_data->>'app_name' = 'my-chatbot' then
    insert into public.chatbot_profiles (id, email, full_name)
    values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
-- Note: We check if the trigger exists first to avoid errors if you run this multiple times
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_chatbot') then
    create trigger on_auth_user_created_chatbot
      after insert on auth.users
      for each row execute procedure public.handle_new_chatbot_user();
  end if;
end
$$;
