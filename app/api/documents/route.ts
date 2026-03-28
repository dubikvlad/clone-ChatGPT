import { NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { findChatById, insertDocument, listDocsByChat, deleteDocument } from "@/lib/db";
import { ok, noAuth, notFound, err, serverErr } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const chatId = req.nextUrl.searchParams.get("chatId");
    if (!chatId) return err("chatId required");
    const user = await getRequestSession(req);
    const chat = await findChatById(chatId);
    if (!chat) return notFound("Chat");
    if (chat.user_id && (!user || chat.user_id !== user.id)) return noAuth();
    const docs = await listDocsByChat(chatId);
    return ok({ documents: docs });
  } catch (e) { return serverErr(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestSession(req);
    const formData = await req.formData();
    const chatId = formData.get("chatId") as string;
    const file = formData.get("file") as File | null;

    if (!chatId || !file) return err("chatId and file required");

    const chat = await findChatById(chatId);
    if (!chat) return notFound("Chat");
    if (chat.user_id && (!user || chat.user_id !== user.id)) return noAuth();

    // Extract text content
    let content = "";
    const mt = file.type;
    if (mt === "text/plain" || mt === "text/markdown" || mt === "text/csv") {
      content = await file.text();
    } else if (mt === "application/json") {
      const text = await file.text();
      try { content = JSON.stringify(JSON.parse(text), null, 2); } catch { content = text; }
    } else {
      return err("Unsupported file type. Please upload .txt, .md, .csv, or .json files.", 400);
    }

    // Truncate to 100KB
    content = content.slice(0, 100_000);

    const doc = await insertDocument({
      chat_id: chatId,
      user_id: user?.id ?? null,
      name: file.name,
      content,
      size: file.size,
      mime_type: file.type,
    });

    return ok({ document: doc }, 201);
  } catch (e) { return serverErr(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const docId = req.nextUrl.searchParams.get("id");
    const chatId = req.nextUrl.searchParams.get("chatId");
    if (!docId || !chatId) return err("id and chatId required");
    const user = await getRequestSession(req);
    const chat = await findChatById(chatId);
    if (!chat) return notFound("Chat");
    if (chat.user_id && (!user || chat.user_id !== user.id)) return noAuth();
    await deleteDocument(docId);
    return ok({ success: true });
  } catch (e) { return serverErr(e); }
}
