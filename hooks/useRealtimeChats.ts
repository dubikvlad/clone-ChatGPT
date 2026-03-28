"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { useMe } from "@/hooks/useAuth";

let _client: ReturnType<typeof createClient> | null = null;
function getRealtimeClient() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    _client = createClient(url, key);
  }
  return _client;
}

export function useRealtimeMessages(chatId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!chatId) return;
    const client = getRealtimeClient();
    if (!client) return;

    const channel = client
      .channel(`messages-realtime-${chatId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["messages", chatId] });
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [chatId, qc]);
}

export function useRealtimeChats() {
  const qc = useQueryClient();
  const { data } = useMe();
  const userId = data?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const client = getRealtimeClient();
    if (!client) return;

    const channel = client
      .channel("chats-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "chats",
        filter: `user_id=eq.${userId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["chats"] });
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [userId, qc]);
}
