import { NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { listChatsByUser, insertChat } from "@/lib/db";
import { ok, noAuth, serverErr, parseJson } from "@/lib/api/response";
import type { CreateChatRequest } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getRequestSession(req);
    if (!user) return noAuth();
    const chats = await listChatsByUser(user.id);
    return ok({ chats });
  } catch (e) {
    return serverErr(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getRequestSession(req);
    const body = await parseJson<CreateChatRequest>(req);
    const chat = await insertChat({
      user_id: user?.id ?? null,
      title: body?.title ?? "New Chat",
      model: body?.model ?? "claude-sonnet-4-20250514",
    });
    return ok({ chat }, 201);
  } catch (e) {
    return serverErr(e);
  }
}
