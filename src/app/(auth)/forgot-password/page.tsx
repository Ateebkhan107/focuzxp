// This page allows users to request a password reset email
// Users enter their email and receive a link to reset their password
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  // Email input value
  const [email, setEmail] = useState("");
  // Whether the reset email has been sent successfully
  const [sent, setSent] = useState(false);
  // Error message if sending fails
  const [error, setError] = useState("");

  // Handle password reset request
  async function handleReset() {
    setError("");

    // Send a password reset email to the user
    // The email contains a link that redirects to /reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // If email was sent successfully, show success message
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-slate-900">
          Reset your password
        </h1>

        {sent ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-slate-700">
              Check your email for a password reset link.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm font-medium">
                  {error}
                </p>
              </div>
            )}

            <div className="mb-6">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && handleReset()}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all duration-300 min-h-[44px]"
              />
            </div>

            <button
              onClick={handleReset}
              disabled={!email}
              className="w-full bg-[#2563eb] text-white py-3 rounded-xl font-medium hover:bg-blue-700 active:scale-95 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2563eb] shadow-md hover:shadow-lg min-h-[44px] flex items-center justify-center"
            >
              Send reset link
            </button>
          </>
        )}
      </div>
    </main>
  );
}
