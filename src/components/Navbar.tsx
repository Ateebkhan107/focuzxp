"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  // auth user
  const [user, setUser] = useState<any>(null);

  // profile username (from profiles table)
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    async function init() {
      // initial session
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);

      if (u) {
        await loadUsername(u.id);
      } else {
        setUsername("");
      }
    }

    init();

    // realtime auth updates
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        await loadUsername(u.id);
      } else {
        setUsername("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUsername(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Username load error:", error.message);
      setUsername("");
      return;
    }

    setUsername(data?.username ?? "");
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      // ✅ Clear UI immediately
      setUser(null);
      setUsername("");
      setMenuOpen(false);

      // ✅ Force reload to fully reset app state (fixes stuck logged-in issues)
      window.location.href = "/";
    }
  }

  const displayName = username || (user?.email ? user.email.split("@")[0] : "");

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur border-b border-slate-200 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-bold text-lg text-slate-900 hover:text-blue-700 transition"
            onClick={() => setMenuOpen(false)}
          >
            FocuzXP
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <NavLinks user={user} />

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">
                  Logged in as <span className="font-semibold">@{displayName}</span>
                </span>

                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition"
            aria-label="Toggle menu"
          >
            <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-4 flex flex-col gap-3">
            <MobileLink href="/" onClick={() => setMenuOpen(false)}>
              Home
            </MobileLink>

            <MobileLink href="/focus" onClick={() => setMenuOpen(false)}>
              Focus
            </MobileLink>

            <MobileLink href="/leaderboard" onClick={() => setMenuOpen(false)}>
              Leaderboard
            </MobileLink>

            {/* ✅ Planner only when logged in */}
            {user && (
              <MobileLink href="/planner" onClick={() => setMenuOpen(false)}>
                Planner
              </MobileLink>
            )}

            {/* ✅ Profile only when logged in */}
            {user && (
              <MobileLink href="/profile" onClick={() => setMenuOpen(false)}>
                Profile
              </MobileLink>
            )}

            <div className="border-t pt-3">
              {user ? (
                <>
                  <div className="text-sm text-slate-500 mb-2">
                    Logged in as <span className="font-semibold">@{displayName}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-red-600 py-2 font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <MobileLink href="/login" onClick={() => setMenuOpen(false)}>
                  Login
                </MobileLink>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ================= Helpers ================= */

function NavLinks({ user }: { user: any }) {
  return (
    <>
      <Link href="/" className="text-sm text-slate-700 hover:text-slate-900 transition">
        Home
      </Link>

      <Link
        href="/focus"
        className="text-sm text-slate-700 hover:text-slate-900 transition"
      >
        Focus
      </Link>

      <Link
        href="/leaderboard"
        className="text-sm text-slate-700 hover:text-slate-900 transition"
      >
        Leaderboard
      </Link>

      {/* ✅ Planner only for logged-in users */}
      {user && (
        <Link
          href="/planner"
          className="text-sm text-slate-700 hover:text-slate-900 transition"
        >
          Planner
        </Link>
      )}

      {/* ✅ Profile only for logged-in users */}
      {user && (
        <Link
          href="/profile"
          className="text-sm text-slate-700 hover:text-slate-900 transition"
        >
          Profile
        </Link>
      )}
    </>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="py-2 text-slate-700 text-base hover:text-slate-900 transition"
    >
      {children}
    </Link>
  );
}
