import { NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { findChatById, updateChat, deleteChat } from "@/lib/db";
import { ok, noAuth, notFound, err, serverErr, parseJson } from "@/lib/api/response";

type Ctx = { params: Promise<{ chatId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { chatId } = await params;
    const user = await getRequestSession(req);

    if (!user) return noAuth();
    const chat = await findChatById(chatId);

    if (!chat) return notFound("Chat");
    if (chat.user_id && chat.user_id !== user.id) return err("Forbidden", 403);
    return ok({ chat });
  } catch (e) { return serverErr(e); }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { chatId } = await params;
    const user = await getRequestSession(req);

    if (!user) return noAuth();
    const chat = await findChatById(chatId);

    if (!chat) return notFound("Chat");
    if (chat.user_id && chat.user_id !== user.id) return err("Forbidden", 403);
    
    const body = await parseJson<{ title?: string; model?: string }>(req);
    await updateChat(chatId, { title: body?.title, model: body?.model });
    return ok({ ok: true });
  } catch (e) { return serverErr(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { chatId } = await params;
    const user = await getRequestSession(req);

    if (!user) return noAuth();
    const chat = await findChatById(chatId);

    if (!chat) return notFound("Chat");
    if (chat.user_id && chat.user_id !== user.id) return err("Forbidden", 403);

    await deleteChat(chatId);
    return ok({ ok: true });
  } catch (e) { return serverErr(e); }
}
