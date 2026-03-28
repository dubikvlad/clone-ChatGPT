import { NextResponse } from "next/server";
export const ok     = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const err    = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
export const noAuth = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const notFound = (res = "Resource") => NextResponse.json({ error: `${res} not found` }, { status: 404 });
export const serverErr = (e?: unknown) => { console.error(e); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); };
export async function parseJson<T>(req: Request): Promise<T | null> {
  try { return await req.json(); } catch { return null; }
}
