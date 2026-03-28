"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, AlertCircle } from "lucide-react";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { useRealtimeMessages } from "@/hooks/useRealtimeChats";
import { useMe } from "@/hooks/useAuth";
import { useAnonymousLimit } from "@/hooks/useAnonymousLimit";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { EmptyState } from "@/components/chat/EmptyState";
import { DocumentPanel } from "@/components/chat/DocumentPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Attachment, AIModel } from "@/types";
import { ANONYMOUS_LIMIT } from "@/types";

interface Props { params: Promise<{ chatId: string }> }

export default function ChatPage({ params }: Props) {
  const { chatId } = use(params);
  const router = useRouter();
  const [showDocs, setShowDocs] = useState(false);

  const { data: meData } = useMe();
  const user = meData?.user;
  const { used, increment } = useAnonymousLimit();

  const { data, isLoading, error } = useMessages(chatId);
  useRealtimeMessages(chatId);
  const messages = data?.messages ?? [];
  const { send, streaming, streamText, error: sendError, abort } = useSendMessage(chatId);

  const isAnonymous = !user;
  const isLimited = isAnonymous && used >= ANONYMOUS_LIMIT;

  const handleSend = async (content: string, attachments?: Attachment[], model?: AIModel) => {
    if (isLimited) return;
    if (isAnonymous) increment();
    await send(content, attachments, model);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 animate-pulse" />
            <p className="text-sm text-muted-foreground animate-pulse">Loading conversation…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 h-full items-center justify-center gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load conversation</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>Go home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2">
            {isAnonymous && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <span>{ANONYMOUS_LIMIT - used} free message{ANONYMOUS_LIMIT - used !== 1 ? "s" : ""} left</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-1.5 text-xs", showDocs && "bg-accent")}
            onClick={() => setShowDocs(!showDocs)}
          >
            <FileText className="h-4 w-4" />
            Documents
          </Button>
        </header>

        {messages.length === 0 && !streaming ? (
          <EmptyState onPrompt={(p) => handleSend(p)} />
        ) : (
          <MessageList messages={messages} streaming={streaming} streamText={streamText} />
        )}

        {sendError && (
          <div className="px-4 py-2 mx-auto max-w-3xl w-full">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {sendError}
              {sendError.includes("limit") && !user && (
                <Button asChild size="sm" variant="destructive" className="ml-auto h-6 text-xs">
                  <a href="/login">Sign in</a>
                </Button>
              )}
            </div>
          </div>
        )}

        {isLimited && (
          <div className="px-4 py-2 mx-auto max-w-3xl w-full">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-sm">
              <span className="text-foreground font-medium">You've used your {ANONYMOUS_LIMIT} free messages.</span>
              <Button asChild size="sm" className="ml-auto shrink-0 h-7 text-xs">
                <a href="/register">Sign up free</a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0 h-7 text-xs">
                <a href="/login">Sign in</a>
              </Button>
            </div>
          </div>
        )}

        <ChatInput onSend={handleSend} onStop={abort} streaming={streaming} disabled={isLimited} />
      </div>

      {showDocs && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowDocs(false)} />
      )}
      {showDocs && (
        <aside className={cn(
          "w-72 border-l border-border bg-sidebar overflow-y-auto",
          "fixed inset-y-0 right-0 z-50 animate-slide-right md:relative md:inset-auto md:z-auto md:animate-none"
        )}>
          <DocumentPanel chatId={chatId} />
        </aside>
      )}
    </div>
  );
}
