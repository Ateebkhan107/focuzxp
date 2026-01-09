// This page allows existing users to log in to their account
// After successful login, users are redirected to the focus page
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  // Form input values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Error message to display if login fails
  const [error, setError] = useState("");
  // Whether login request is in progress
  const [loading, setLoading] = useState(false);

  // Handle login form submission
  async function handleLogin() {
    // Clear any previous errors
    setError("");
    setLoading(true);

    // Attempt to sign in with email and password
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // If login fails, show error message
      setError(error.message);
      setLoading(false);
      return;
    }

    // If login succeeds, redirect to focus page
    router.push("/focus");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 w-full max-w-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-slate-900">
          Welcome back
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-600 text-sm font-medium">
              {error}
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-300 min-h-[44px]"
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-300 min-h-[44px]"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-[#2563eb] text-white py-3 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2563eb] shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-center text-slate-500 mt-6">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="text-[#2563eb] hover:underline font-medium transition-colors">
            Reset it
          </Link>
        </p>

        <p className="text-sm text-center text-slate-500 mt-4">
          Don't have an account?{" "}
          <Link href="/signup" className="text-[#2563eb] hover:underline font-medium transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
