import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByEmail, insertUser } from "@/lib/db";
import { signToken, authCookie } from "@/lib/auth";
import { ok, err, serverErr, parseJson } from "@/lib/api/response";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be ≥ 8 characters"),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await parseJson<unknown>(req);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message);

    const { email, password, name } = parsed.data;
    if (await findUserByEmail(email)) return err("Email already registered", 409);

    const password_hash = await bcrypt.hash(password, 12);
    const user = await insertUser({ email, name, password_hash });
    const token = await signToken({ id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url });
    const res = ok({ user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }, token }, 201);
    res.cookies.set(authCookie(token));
    return res;
  } catch (e) { return serverErr(e); }
}
