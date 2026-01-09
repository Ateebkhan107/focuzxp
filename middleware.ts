// This middleware runs before every page request to protect routes
// It checks if the user is logged in and redirects them if needed
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// This function runs on the server before rendering any page
// It checks authentication and redirects users to the right place
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client that can read/write cookies
  // This is needed to check the user's session on the server
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

  // Check if the user has an active session (is logged in)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Check if the current page is a login/signup page
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // Check if the current page requires login to access
  const isProtectedPage =
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/profile");

  // If user is not logged in and tries to access a protected page,
  // redirect them to the login page
  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If user is already logged in and tries to access login/signup,
  // redirect them to the focus page (they don't need to log in again)
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL("/focus", req.url));
  }

  // If no redirect is needed, allow the request to continue
  return res;
}

// This tells Next.js which routes should run this middleware
// Only these specific routes will be checked
export const config = {
  matcher: [
    "/leaderboard/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
  ],
};
