export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string | null;
  title: string;
  model: AIModel;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[] | null;
  created_at: string;
}

export interface Document {
  id: string;
  chat_id: string;
  user_id: string | null;
  name: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface LoginRequest  { email: string; password: string }
export interface RegisterRequest { email: string; password: string; name: string }
export interface AuthResponse  { user: SessionUser; token: string }

export interface CreateChatRequest  { title?: string; model?: AIModel }
export interface UpdateChatRequest  { title: string }
export interface SendMessageRequest {
  content: string;
  attachments?: Attachment[];
  model?: AIModel;
}

export type AIModel =
  | "claude-opus-4-20250514"
  | "claude-sonnet-4-20250514"
  | "claude-haiku-4-5-20251001"
  | "gpt-4o"
  | "gpt-4o-mini";

export interface ModelOption {
  id: AIModel;
  name: string;
  provider: "anthropic" | "openai";
  description: string;
}

export interface Attachment {
  type: "image" | "document";
  name: string;
  mimeType: string;
  size: number;
  data?: string; // base64 for images, plain text for documents
  url?: string;  // for stored docs
}

export interface StreamChunk {
  type: "text" | "done" | "error";
  content?: string;
  error?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
}

export const ANONYMOUS_LIMIT = 3;

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "claude-opus-4-20250514",   name: "Claude Opus 4",   provider: "anthropic", description: "Most powerful, best for complex tasks" },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "anthropic", description: "Smart and fast – recommended" },
  { id: "claude-haiku-4-5-20251001",name: "Claude Haiku",    provider: "anthropic", description: "Lightning fast, great for simple tasks" },
  { id: "gpt-4o",                   name: "GPT-4o",          provider: "openai",    description: "OpenAI flagship model" },
  { id: "gpt-4o-mini",              name: "GPT-4o mini",     provider: "openai",    description: "Fast & cost-effective" },
];
