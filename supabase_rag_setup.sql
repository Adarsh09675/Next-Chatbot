-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. DOCUMENTS TABLE (RAG)
create table if not exists public.documents (
  id bigint primary key generated always as identity,
  content text, -- Optional: store the full text
  name text not null, -- Filename
  user_id uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;

-- 2. DOCUMENT SECTIONS TABLE (Embeddings)
create table if not exists public.document_sections (
  id bigint primary key generated always as identity,
  document_id bigint references public.documents(id) on delete cascade not null,
  content text not null, -- The chunk of text
  embedding vector(768), -- Gemini embeddings are 768 dimensions
  token_count int
);

alter table public.document_sections enable row level security;

-- 3. CHATS TABLE (History)
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chats enable row level security;

-- 4. MESSAGES TABLE (History)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade not null,
  role text not null, -- 'user' or 'assistant'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

-- RLS POLICIES (Drop first to avoid "already exists" errors)

-- Documents
drop policy if exists "Users can view own documents" on public.documents;
create policy "Users can view own documents" on public.documents for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own documents" on public.documents;
create policy "Users can insert own documents" on public.documents for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own documents" on public.documents;
create policy "Users can delete own documents" on public.documents for delete using (auth.uid() = user_id);

-- Sections
drop policy if exists "Users can view own sections" on public.document_sections;
create policy "Users can view own sections" on public.document_sections for select using (
  exists (select 1 from public.documents where id = document_sections.document_id and user_id = auth.uid())
);

drop policy if exists "Users can insert own sections" on public.document_sections;
create policy "Users can insert own sections" on public.document_sections for insert with check (
  exists (select 1 from public.documents where id = document_sections.document_id and user_id = auth.uid())
);

-- Chats
drop policy if exists "Users can view own chats" on public.chats;
create policy "Users can view own chats" on public.chats for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own chats" on public.chats;
create policy "Users can insert own chats" on public.chats for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chats" on public.chats;
create policy "Users can delete own chats" on public.chats for delete using (auth.uid() = user_id);

-- Messages
drop policy if exists "Users can view own messages" on public.messages;
create policy "Users can view own messages" on public.messages for select using (
  exists (select 1 from public.chats where id = messages.chat_id and user_id = auth.uid())
);

drop policy if exists "Users can insert own messages" on public.messages;
create policy "Users can insert own messages" on public.messages for insert with check (
  exists (select 1 from public.chats where id = messages.chat_id and user_id = auth.uid())
);

-- SEARCH FUNCTION
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    public.document_sections.id,
    public.document_sections.content,
    1 - (public.document_sections.embedding <=> query_embedding) as similarity
  from public.document_sections
  join public.documents on public.documents.id = public.document_sections.document_id
  where 1 - (public.document_sections.embedding <=> query_embedding) > match_threshold
  and public.documents.user_id = auth.uid()
  order by public.document_sections.embedding <=> query_embedding
  limit match_count;
end;
$$;
