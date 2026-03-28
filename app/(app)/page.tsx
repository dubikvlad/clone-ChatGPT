"use client";
import { useRouter } from "next/navigation";
import { useCreateChat } from "@/hooks/useChats";
import { useMe } from "@/hooks/useAuth";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANONYMOUS_LIMIT } from "@/types";

export default function HomePage() {
  const { data: meData, isLoading } = useMe();
  const user = meData?.user;
  const createChat = useCreateChat();
  const router = useRouter();

  const handleStart = async () => {
    const res = await createChat.mutateAsync({});
    router.push(`/chat/${res.chat.id}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 animate-fade-in">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/20">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome to Aria Chat</h1>
        <p className="text-muted-foreground text-base">
          {user
            ? `Hello, ${user.name}! Ready to start a conversation?`
            : "Your AI assistant powered by Claude and GPT-4. Sign up for unlimited access."}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleStart} size="lg" disabled={createChat.isPending} className="gap-2 min-w-[160px]">
          {createChat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {createChat.isPending ? "Starting…" : "Start chatting"}
        </Button>
        {!user && !isLoading && (
          <>
            <Button asChild variant="outline" size="lg"><a href="/register">Create account</a></Button>
            <Button asChild variant="ghost" size="lg"><a href="/login">Sign in</a></Button>
          </>
        )}
      </div>

      {!user && (
        <p className="text-xs text-muted-foreground">
          Try it free — {ANONYMOUS_LIMIT} messages without an account
        </p>
      )}
    </div>
  );
}
