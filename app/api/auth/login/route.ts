import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { findUserByEmail } from "@/lib/db";
import { signToken, authCookie } from "@/lib/auth";
import { ok, err, serverErr, parseJson } from "@/lib/api/response";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = await parseJson<unknown>(req);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Invalid credentials", 401);

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);
    if (!user || !await bcrypt.compare(password, user.password_hash)) return err("Invalid credentials", 401);

    const sessionUser = { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url };
    const token = await signToken(sessionUser);
    const res = ok({ user: sessionUser, token });
    res.cookies.set(authCookie(token));
    return res;
  } catch (e) { return serverErr(e); }
}
