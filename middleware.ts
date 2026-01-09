import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_req: NextRequest) {
  // ❌ We do NOT check Supabase auth in middleware
  // ✅ Auth checks are done inside pages (client-side)
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup"],
};
