// This component displays the footer at the bottom of all main pages
// It includes the app name, navigation links, and copyright information
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Main Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand Section */}
          <div className="text-center md:text-left">
            <Link
              href="/"
              className="text-2xl font-bold text-[#2563eb] mb-2 block transition-all duration-300 ease-out hover:scale-105"
            >
              FocuzXP
            </Link>
            <p className="text-slate-500 text-sm">
              Turn focus into progress
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            <Link
              href="/"
              className="text-slate-600 hover:text-[#2563eb] transition-all duration-300 ease-out text-sm font-medium"
            >
              Home
            </Link>
            <Link
              href="/focus"
              className="text-slate-600 hover:text-[#2563eb] transition-all duration-300 ease-out text-sm font-medium"
            >
              Focus
            </Link>
            <Link
              href="/leaderboard"
              className="text-slate-600 hover:text-[#2563eb] transition-all duration-300 ease-out text-sm font-medium"
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className="text-slate-600 hover:text-[#2563eb] transition-all duration-300 ease-out text-sm font-medium"
            >
              Profile
            </Link>
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs">
            © 2025 FocuzXP
          </p>
          <p className="text-slate-400 text-xs italic">
            Built with focus and care
          </p>
        </div>
      </div>
    </footer>
  );
}

