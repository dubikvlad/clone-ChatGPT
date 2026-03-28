-- ─────────────────────────────────────────────────────────────────────────────
-- ChatGPT Clone – Initial Schema
-- Accessed exclusively via service-role key (no RLS needed).
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── users ────────────────────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text not null,
  password_hash text not null,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

create index if not exists users_email_idx on users (email);

-- ── chats ────────────────────────────────────────────────────────────────────
create table if not exists chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users (id) on delete cascade,  -- null = anonymous
  title       text not null default 'New Chat',
  model       text not null default 'claude-sonnet-4-20250514',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chats_user_id_idx on chats (user_id, updated_at desc);

-- ── messages ─────────────────────────────────────────────────────────────────
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references chats (id) on delete cascade,
  role        text not null check (role in ('user','assistant','system')),
  content     text not null,
  attachments jsonb,           -- [{type, name, mimeType, size, url?}]
  created_at  timestamptz not null default now()
);

create index if not exists messages_chat_id_idx on messages (chat_id, created_at asc);

-- ── documents ─────────────────────────────────────────────────────────────────
-- Stores extracted text from uploaded files for RAG context injection.
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references chats (id) on delete cascade,
  user_id     uuid references users (id) on delete set null,
  name        text not null,
  content     text not null,  -- extracted plain text (used for context)
  size        bigint not null,
  mime_type   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists documents_chat_id_idx on documents (chat_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Required for Supabase Realtime postgres_changes with filters.
alter table chats replica identity full;
alter table messages replica identity full;

-- Allow anon role to receive realtime events (app uses custom auth, not Supabase Auth).
alter table chats enable row level security;
alter table messages enable row level security;

create policy "allow anon realtime" on chats for select to anon using (true);
create policy "allow anon realtime" on messages for select to anon using (true);

-- ── anonymous_sessions ────────────────────────────────────────────────────────
-- Tracks how many free questions an anonymous visitor has used.
create table if not exists anonymous_sessions (
  id             text primary key,           -- random id stored in cookie
  questions_used int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
