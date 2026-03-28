import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getRequestSession } from "@/lib/auth";
import { findChatById, listMessagesByChat, insertMessage, getDocumentContentByChat, upsertAnonSession, getAnonSession, touchChat, insertChat, updateChat } from "@/lib/db";
import { streamLLM, toApiMessages, generateTitle } from "@/lib/llm";
import { ok, noAuth, notFound, err, serverErr, parseJson } from "@/lib/api/response";
import type { SendMessageRequest, AIModel } from "@/types";
import { ANONYMOUS_LIMIT } from "@/types";

type Ctx = { params: Promise<{ chatId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { chatId } = await params;
    const user = await getRequestSession(req);
    const chat = await findChatById(chatId);

    if (!chat) return notFound("Chat");
    if (chat.user_id && (!user || chat.user_id !== user.id)) return noAuth();
    
    const messages = await listMessagesByChat(chatId);
    return ok({ messages });
  } catch (e) { return serverErr(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { chatId } = await params;
    const user = await getRequestSession(req);

    if (!user) {
      const store = await cookies();
      const sessionId = store.get("anon_session")?.value;

      if (sessionId) {
        const anonSession = await getAnonSession(sessionId);
        const used = anonSession?.questions_used ?? 0;

        if (used >= ANONYMOUS_LIMIT) {
          return err("Free message limit reached. Please sign up to continue.", 403);
        }
        await upsertAnonSession(sessionId, used + 1);
      }
    }

    const body = await parseJson<SendMessageRequest>(req);

    if (!body?.content?.trim() && !(body?.attachments?.length)) return err("Message content required");

    let chat = await findChatById(chatId);

    if (!chat) return notFound("Chat");
    if (chat.user_id && (!user || chat.user_id !== user.id)) return noAuth();

    const model: AIModel = (body.model ?? chat.model) as AIModel;

    const userMsg = await insertMessage({
      chat_id: chatId,
      role: "user",
      content: body.content ?? "",
      attachments: body.attachments ? JSON.parse(JSON.stringify(
        body.attachments.map((a) => ({ ...a, data: undefined })) // strip base64 from DB
      )) : null,
    });

    const docContents = await getDocumentContentByChat(chatId);
    let systemPrompt = "You are a helpful AI assistant. Be concise and accurate.";

    if (docContents.length > 0) {
      const combined = docContents.join("\n\n---\n\n").slice(0, 40_000);
      systemPrompt += `\n\nThe user has uploaded the following documents. Use them as context:\n\n${combined}`;
    }

    const history = await listMessagesByChat(chatId);
    const llmMessages = toApiMessages(
      history.map((m) =>
        m.id === userMsg.id
          ? { ...m, attachments: body.attachments ?? null } // re-attach base64 for vision
          : m
      )
    );

    let stream: ReadableStream<Uint8Array>;
    
    try {
      stream = await streamLLM({ model, messages: llmMessages, system: systemPrompt });
    } catch (e: any) {
      return err(`LLM error: ${e.message}`, 502);
    }

    let fullText = "";
    const isFirstMessage = history.filter((m) => m.role === "user").length <= 1;

    const transformedStream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        const reader = stream.getReader();
        const dec = new TextDecoder();
        let buf = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            ctrl.enqueue(value);
            buf += dec.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() ?? "";
            for (const part of parts) {
              if (part.startsWith("data: ")) {
                try {
                  const chunk = JSON.parse(part.slice(6));
                  if (chunk.type === "text") fullText += chunk.content;
                } catch { }
              }
            }
          }
        } catch { }
        // Persist whatever was generated (even if client aborted mid-stream)
        if (fullText) {
          await insertMessage({ chat_id: chatId, role: "assistant", content: fullText });
          await touchChat(chatId);
          // Auto-title on first exchange
          if (isFirstMessage && chat.title === "New Chat") {
            const title = await generateTitle(body.content ?? "");
            await updateChat(chatId, { title });
          }
        }
        ctrl.close();
      },
    });

    return new Response(transformedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Message-Id": userMsg.id,
      },
    });
  } catch (e) { return serverErr(e); }
}
