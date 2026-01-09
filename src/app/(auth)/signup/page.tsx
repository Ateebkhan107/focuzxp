// Signup page — creates auth account only
// Profile is created AFTER email verification
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError("");
    setLoading(true);

    if (!username || !email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    // ✅ Check username uniqueness (good practice)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (existing) {
      setError("Username already taken");
      setLoading(false);
      return;
    }

    // ✅ Create auth user ONLY
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // temporarily stored in auth metadata
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // ✅ Redirect to verify-email page
    router.push("/verify-email");
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 w-full max-w-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-slate-900">
          Create your account
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 min-h-[44px]"
            disabled={loading}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 min-h-[44px]"
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 min-h-[44px]"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-[#2563eb] text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="text-sm text-center text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#2563eb] hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
