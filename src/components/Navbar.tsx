"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link
            href="/"
            className="font-bold text-lg text-slate-900"
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
                  @{user.email?.split("@")[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
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

            {user && (
              <MobileLink href="/profile" onClick={() => setMenuOpen(false)}>
                Profile
              </MobileLink>
            )}

            <div className="border-t pt-3">
              {user ? (
                <>
                  <div className="text-sm text-slate-500 mb-2">
                    Logged in as @{user.email?.split("@")[0]}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-red-600 py-2"
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
      <Link href="/" className="text-sm text-slate-700 hover:text-slate-900">
        Home
      </Link>
      <Link href="/focus" className="text-sm text-slate-700 hover:text-slate-900">
        Focus
      </Link>
      <Link
        href="/leaderboard"
        className="text-sm text-slate-700 hover:text-slate-900"
      >
        Leaderboard
      </Link>

      {/* Profile only for logged-in users */}
      {user && (
        <Link
          href="/profile"
          className="text-sm text-slate-700 hover:text-slate-900"
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
      className="py-2 text-slate-700 text-base hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
