import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // pages that should not be accessible when logged in
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  // pages that must be protected
  const isProtectedPage =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/focus");

  // ❌ Not logged in → block protected pages
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ❌ Logged in → block auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/focus", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/focus/:path*",
    "/profile/:path*",
    "/leaderboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
