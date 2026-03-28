import { clearCookie } from "@/lib/auth";
import { ok } from "@/lib/api/response";
export async function POST() {
  const res = ok({ ok: true });
  res.cookies.set(clearCookie());
  return res;
}
