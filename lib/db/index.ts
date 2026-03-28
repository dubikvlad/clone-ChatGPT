/**
 * lib/db/index.ts
 * Server-only Supabase access using the service-role key.
 * No RLS. Never imported from client components.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    _client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return _client;
}

export async function findUserByEmail(email: string) {
  const { data } = await db().from("users").select("*").eq("email", email).single();
  return data ?? null;
}
export async function findUserById(id: string) {
  const { data } = await db().from("users").select("id,email,name,avatar_url,created_at").eq("id", id).single();
  return data ?? null;
}
export async function insertUser(params: { email: string; name: string; password_hash: string }) {
  const { data, error } = await db().from("users").insert(params).select("id,email,name,avatar_url,created_at").single();
  if (error) throw error;
  return data!;
}

export async function listChatsByUser(userId: string) {
  const { data, error } = await db()
    .from("chats")
    .select("id,user_id,title,model,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function findChatById(chatId: string) {
  const { data } = await db().from("chats").select("*").eq("id", chatId).single();
  return data ?? null;
}
export async function insertChat(params: { user_id: string | null; title: string; model: string }) {
  const { data, error } = await db().from("chats").insert(params).select().single();
  if (error) throw error;
  return data!;
}
export async function updateChat(chatId: string, fields: { title?: string; model?: string }) {
  const { error } = await db().from("chats").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", chatId);
  if (error) throw error;
}
export async function touchChat(chatId: string) {
  await db().from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
}
export async function deleteChat(chatId: string) {
  const { error } = await db().from("chats").delete().eq("id", chatId);
  if (error) throw error;
}

export async function listMessagesByChat(chatId: string) {
  const { data, error } = await db().from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function insertMessage(params: {
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: object | null;
}) {
  const { data, error } = await db().from("messages").insert(params).select().single();
  if (error) throw error;
  return data!;
}

export async function listDocsByChat(chatId: string) {
  const { data, error } = await db().from("documents").select("id,chat_id,user_id,name,size,mime_type,created_at").eq("chat_id", chatId);
  if (error) throw error;
  return data ?? [];
}
export async function insertDocument(params: {
  chat_id: string; user_id: string | null; name: string; content: string; size: number; mime_type: string;
}) {
  const { data, error } = await db().from("documents").insert(params).select("id,chat_id,user_id,name,size,mime_type,created_at").single();
  if (error) throw error;
  return data!;
}
export async function deleteDocument(docId: string) {
  const { error } = await db().from("documents").delete().eq("id", docId);
  if (error) throw error;
}
export async function getDocumentContent(docId: string): Promise<string | null> {
  const { data } = await db().from("documents").select("content").eq("id", docId).single();
  return data?.content ?? null;
}
export async function getDocumentContentByChat(chatId: string): Promise<string[]> {
  const { data } = await db().from("documents").select("content").eq("chat_id", chatId);
  return (data ?? []).map((d: any) => d.content as string);
}

export async function getAnonSession(sessionId: string) {
  const { data } = await db().from("anonymous_sessions").select("*").eq("id", sessionId).single();
  return data ?? null;
}
export async function upsertAnonSession(sessionId: string, questionsUsed: number) {
  const { error } = await db().from("anonymous_sessions").upsert({ id: sessionId, questions_used: questionsUsed, updated_at: new Date().toISOString() });
  if (error) throw error;
}
