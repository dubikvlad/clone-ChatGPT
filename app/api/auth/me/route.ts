import { NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { ok, noAuth } from "@/lib/api/response";
export async function GET(req: NextRequest) {
  const user = await getRequestSession(req);
  if (!user) return noAuth();
  return ok({ user });
}
