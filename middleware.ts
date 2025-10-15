import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This middleware ensures every visitor gets a unique, persistent cookie
// named `ambience_user_id`. We'll set it as httpOnly and secure in
// production, with a 1 year maxAge.

const USER_ID_COOKIE_NAME = "ambience_user_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const cookie = req.cookies.get(USER_ID_COOKIE_NAME);
  if (!cookie) {
    const id = crypto.randomUUID();
    const res = NextResponse.next();

    // Set cookie with secure/httpOnly in production
    res.cookies.set({
      name: USER_ID_COOKIE_NAME,
      value: id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    });

    return res;
  }

  return NextResponse.next();
}

// Run on all routes so the cookie exists for both API and pages
export const config = {
  matcher: "/:path*",
};
