# Aria Chat — ChatGPT-like AI Assistant

A full-stack AI chat application built with Next.js 15, Supabase, and multiple LLM providers (Anthropic Claude + OpenAI GPT-4).

## ✨ Features

- **Streaming AI responses** — real-time token-by-token output via SSE
- **Multiple LLM providers** — Claude Opus/Sonnet/Haiku and GPT-4o/mini, switchable per message
- **Persistent chat history** — stored in Postgres via Supabase
- **Authentication** — email/password with JWT sessions (httpOnly cookies)
- **Anonymous access** — 3 free messages before prompting sign-up
- **Image attachments** — paste or upload images for vision models
- **Document upload** — upload PDF/TXT/MD/CSV/JSON files used as RAG context
- **Real-time sync** — new chats appear across browser tabs via Supabase Realtime
- **Collapsible sidebar** — grouped by Today / Yesterday / Last 7 days / Older
- **Rename & delete chats** — inline editing in sidebar
- **Auto-generated titles** — first message auto-titles the chat via Claude Haiku
- **Dark mode** — defaults to dark theme, full Tailwind dark mode support
- **Responsive** — works on mobile and desktop

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (React + TanStack Query)                   │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │ Sidebar  │  │ Chat Page  │  │  Auth Pages     │ │
│  │ (hooks)  │  │ (hooks)    │  │  (hooks)        │ │
│  └──────────┘  └────────────┘  └─────────────────┘ │
│        │              │                │            │
│        └──────────────┴────────────────┘            │
│                       │  fetch() only               │
└───────────────────────┼─────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────┐
│  Next.js API Routes   │                             │
│  POST /api/auth/register                            │
│  POST /api/auth/login                               │
│  POST /api/auth/logout                              │
│  GET  /api/auth/me                                  │
│  GET  /api/chats              POST /api/chats       │
│  GET  /api/chats/:id          PATCH /api/chats/:id  │
│                               DELETE /api/chats/:id │
│  GET  /api/chats/:id/messages                       │
│  POST /api/chats/:id/messages  ← streaming SSE      │
│  GET  /api/documents?chatId=   POST /api/documents  │
└───────────────────────┬─────────────────────────────┘
                        │  service-role key (server only)
┌───────────────────────┼─────────────────────────────┐
│  Supabase (Postgres)  │                             │
│  users · chats · messages · documents               │
│  anonymous_sessions                                 │
│                                                     │
│  Supabase Realtime (public anon key — browser only) │
│  → invalidates TanStack Query cache on chat changes │
└─────────────────────────────────────────────────────┘
```

### Key design decisions

| Concern | Decision |
|---------|----------|
| **DB access** | Always via service-role key in API routes. No public client, no RLS |
| **Auth** | JWT signed with `jose`, stored in httpOnly cookie — no localStorage |
| **Streaming** | Native `ReadableStream` SSE — no external streaming library needed |
| **Realtime** | Supabase Realtime with anon key (only option); used only for cache invalidation |
| **API keys** | All LLM keys are server-env only — never in `NEXT_PUBLIC_*` |
| **Anonymous** | Session tracked via httpOnly cookie + `anonymous_sessions` table |

## 📁 Project Structure

```
├── app/
│   ├── (app)/                  # Main app shell (sidebar + chat)
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Home / landing
│   │   └── chat/[chatId]/
│   │       └── page.tsx        # Chat conversation page
│   ├── (auth)/                 # Auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── api/                    # REST API routes
│       ├── auth/{register,login,logout,me}/
│       ├── chats/
│       │   └── [chatId]/messages/
│       └── documents/
├── components/
│   ├── ui/                     # Shadcn primitives
│   ├── chat/                   # MessageBubble, ChatInput, EmptyState…
│   ├── layout/                 # Sidebar
│   └── auth/                   # AuthForm
├── hooks/                      # TanStack Query hooks (data fetching)
├── lib/
│   ├── db/index.ts             # Supabase service-role queries
│   ├── auth.ts                 # JWT sign/verify
│   ├── llm.ts                  # Anthropic + OpenAI streaming
│   ├── api/response.ts         # API response helpers
│   └── utils.ts
├── types/index.ts              # Shared TypeScript types
├── middleware.ts               # Sets anon_session cookie
└── supabase/migrations/        # SQL schema
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic](https://console.anthropic.com) API key and/or [OpenAI](https://platform.openai.com) API key

### 1. Clone & install

```bash
git clone https://github.com/dubikvlad/clone-ChatGPT.git
cd clone-ChatGPT
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# Supabase — Dashboard → Settings → API
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service_role key (never expose)

# Supabase — for Realtime only (browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon/public key

# JWT — generate with: openssl rand -base64 32
JWT_SECRET=your-32+-character-secret

# At least one LLM provider
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...             # optional
```

### 3. Set up the database

Open your **Supabase Dashboard → SQL Editor** and run:

```sql
-- Copy & paste the contents of:
supabase/migrations/001_initial_schema.sql
```

Or if you have `psql` installed:

```bash
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  -f supabase/migrations/001_initial_schema.sql
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

> **Important:** `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, and `OPENAI_API_KEY` are server-only — do **not** prefix them with `NEXT_PUBLIC_`.

## 🔐 Security Notes

- All Supabase DB access uses the **service-role key** in server-side API routes only
- LLM API keys are **never sent to the browser**
- Auth tokens are **httpOnly cookies** — inaccessible to JavaScript
- Anonymous sessions are tracked server-side to prevent client manipulation
- Input is validated with **Zod** on every API route

## 🗄 Database Schema

```sql
users               — id, email, name, password_hash, avatar_url
chats               — id, user_id (nullable), title, model, timestamps
messages            — id, chat_id, role, content, attachments (jsonb)
documents           — id, chat_id, user_id, name, content (text), size, mime_type
anonymous_sessions  — id (cookie value), questions_used
```

Indexes on `users.email`, `chats(user_id, updated_at)`, `messages(chat_id, created_at)`, `documents.chat_id`.

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in, set cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/chats` | List user's chats |
| `POST` | `/api/chats` | Create new chat |
| `GET` | `/api/chats/:id` | Get chat details |
| `PATCH` | `/api/chats/:id` | Rename / update model |
| `DELETE` | `/api/chats/:id` | Delete chat + messages |
| `GET` | `/api/chats/:id/messages` | Get message history |
| `POST` | `/api/chats/:id/messages` | Send message → **SSE stream** |
| `GET` | `/api/documents?chatId=` | List chat documents |
| `POST` | `/api/documents` | Upload document (multipart) |

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 18, Tailwind CSS, Shadcn/ui |
| Data fetching | TanStack Query v5 |
| Database | PostgreSQL via Supabase |
| Auth | Custom JWT with `jose` |
| Realtime | Supabase Realtime |
| LLMs | Anthropic Claude, OpenAI GPT-4 |
| Deployment | Vercel |
