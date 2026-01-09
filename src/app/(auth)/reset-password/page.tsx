// This page allows users to set a new password after clicking a reset link
// Users arrive here from an email link sent by the forgot-password page
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  // New password input value
  const [password, setPassword] = useState("");
  // Error message if password update fails
  const [error, setError] = useState("");
  // Whether the user is allowed to reset (they clicked a valid email link)
  const [allowed, setAllowed] = useState(false);

  // Check if user arrived from a valid password reset email link
  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    // This event fires when Supabase detects a valid reset link
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAllowed(true);
      }
    });
  }, []);

  // Handle password update form submission
  async function handleUpdatePassword() {
    setError("");

    // Update the user's password in Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // After password is reset, sign out the user
    // This ensures they log in again with the new password
    await supabase.auth.signOut();

    // Redirect to login page
    router.push("/login");
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 w-full max-w-sm text-center">
          <p className="text-slate-600">
            Invalid or expired password reset link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 w-full max-w-sm">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-slate-900">
          Set new password
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-600 text-sm font-medium">
              {error}
            </p>
          </div>
        )}

        <div className="mb-6">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && password && handleUpdatePassword()}
            className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-300 min-h-[44px]"
          />
        </div>

        <button
          onClick={handleUpdatePassword}
          disabled={!password}
          className="w-full bg-[#2563eb] text-white py-3 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2563eb] shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center"
        >
          Update password
        </button>
      </div>
    </main>
  );
}
