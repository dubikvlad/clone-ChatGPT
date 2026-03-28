import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Set anonymous session cookie if not present
  if (!req.cookies.get("anon_session")) {
    const sessionId =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookies.set("anon_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
