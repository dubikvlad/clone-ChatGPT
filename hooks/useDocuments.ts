"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Document } from "@/types";

export function useDocuments(chatId: string) {
  return useQuery<{ documents: Document[] }>({
    queryKey: ["documents", chatId],
    queryFn: () => fetch(`/api/documents?chatId=${chatId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!chatId,
  });
}

export function useDeleteDocument(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/documents?id=${docId}&chatId=${chatId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? "Delete failed"); }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", chatId] }),
  });
}

export function useUploadDocument(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("chatId", chatId);
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error ?? "Upload failed"); }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", chatId] }),
  });
}
