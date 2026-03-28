"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useRef } from "react";
import type { Message, Attachment, AIModel, StreamChunk } from "@/types";

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? "Request failed"); }
  return res.json();
}

export function useMessages(chatId: string) {
  return useQuery<{ messages: Message[] }>({
    queryKey: ["messages", chatId],
    queryFn: () => apiFetch(`/api/chats/${chatId}/messages`),
    enabled: !!chatId,
    staleTime: 0,
  });
}

export function useSendMessage(chatId: string) {
  const qc = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (content: string, attachments?: Attachment[], model?: AIModel) => {
    setStreaming(true);
    setStreamText("");
    setError(null);
    abortRef.current = new AbortController();

    // Optimistic user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      role: "user",
      content,
      attachments: attachments ?? null,
      created_at: new Date().toISOString(),
    };
    qc.setQueryData<{ messages: Message[] }>(["messages", chatId], (old) => ({
      messages: [...(old?.messages ?? []), tempUserMsg],
    }));

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachments, model }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to send");
      }

      const messageId = res.headers.get("X-Message-Id");
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          try {
            const chunk: StreamChunk = JSON.parse(part.slice(6));
            if (chunk.type === "text" && chunk.content) {
              full += chunk.content;
              setStreamText(full);
            } else if (chunk.type === "error") {
              throw new Error(chunk.error ?? "Stream error");
            }
          } catch {}
        }
      }

      // Refresh real messages from server
      await qc.invalidateQueries({ queryKey: ["messages", chatId] });
      await qc.invalidateQueries({ queryKey: ["chats"] });

      // Server strips base64 from DB — restore it in cache using the message id
      if (messageId && attachments?.some(a => a.data)) {
        qc.setQueryData<{ messages: Message[] }>(["messages", chatId], (data) => ({
          messages: (data?.messages ?? []).map(m =>
            m.id === messageId ? { ...m, attachments } : m
          ),
        }));
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        // User stopped generation — refresh to show what was saved
        await qc.invalidateQueries({ queryKey: ["messages", chatId] });
        await qc.invalidateQueries({ queryKey: ["chats"] });
      } else {
        setError(e.message);
        qc.setQueryData<{ messages: Message[] }>(["messages", chatId], (old) => ({
          messages: (old?.messages ?? []).filter((m) => m.id !== tempUserMsg.id),
        }));
      }
    } finally {
      setStreaming(false);
      setStreamText("");
    }
  }, [chatId, qc]);

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  return { send, streaming, streamText, error, abort };
}
