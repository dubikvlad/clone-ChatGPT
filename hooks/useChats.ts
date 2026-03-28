"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Chat, CreateChatRequest } from "@/types";

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? "Request failed"); }
  return res.json();
}

export function useChats() {
  return useQuery<{ chats: Chat[] }>({
    queryKey: ["chats"],
    queryFn: () => apiFetch("/api/chats"),
    staleTime: 1000 * 30,
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChatRequest) =>
      apiFetch("/api/chats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useRenameChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      apiFetch(`/api/chats/${chatId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });
}

export function useDeleteChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => apiFetch(`/api/chats/${chatId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chats"] }),
  });
}
