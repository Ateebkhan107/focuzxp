// Profile page — shows user profile, XP/level, and focus stats
// Production-safe: handles session delays + missing profile without crashing
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LEVEL_XP = 500;

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [stats, setStats] = useState({
    sessions: 0,
    minutes: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setError("");
    setLoading(true);

    // ✅ Step 1: Check auth user
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.push("/login");
      return;
    }

    setUser(authData.user);

    // ✅ Step 2: Get profile row (safe mode)
    // maybeSingle() returns null instead of throwing
    let { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("username, email, total_xp")
      .eq("id", authData.user.id)
      .maybeSingle();

    // ✅ If profile not found, wait + retry (trigger might take time)
    if (!profileData) {
      await new Promise((r) => setTimeout(r, 800)); // wait 0.8 sec

      const retry = await supabase
        .from("profiles")
        .select("username, email, total_xp")
        .eq("id", authData.user.id)
        .maybeSingle();

      profileData = retry.data;
      profileError = retry.error;
    }

    if (profileError) {
      setError("Failed to load profile. Check RLS policies.");
      setLoading(false);
      return;
    }

    // still no profile?
    if (!profileData) {
      setError(
        "Profile not found. Your profile was not created in database."
      );
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // ✅ Step 3: Load focus session stats
    const { data: sessions, error: sessionsError } = await supabase
      .from("focus_sessions")
      .select("minutes")
      .eq("user_id", authData.user.id);

    if (!sessionsError && sessions) {
      const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

      setStats({
        sessions: sessions.length,
        minutes: totalMinutes,
      });
    }

    setLoading(false);
  }

  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  // ✅ Loading UI
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-slate-500">Loading profile…</p>
          </div>
        </div>
      </main>
    );
  }

  // ✅ Error UI
  if (error) {
    return (
      <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-md mx-auto bg-white border border-red-200 rounded-2xl p-6 shadow-sm text-center">
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Profile Error
            </h1>
            <p className="text-red-600 text-sm mb-4">{error}</p>

            <button
              onClick={loadProfile}
              className="bg-[#2563eb] text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ✅ Safe calculations
  const level = Math.floor(profile.total_xp / LEVEL_XP) + 1;
  const progress = ((profile.total_xp % LEVEL_XP) / LEVEL_XP) * 100;
  const initials = getInitials(profile.username);

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#2563eb] to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {initials}
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              @{profile.username}
            </h1>

            <p className="text-slate-500 text-sm">{profile.email}</p>
          </div>

          {/* XP card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-sm font-semibold text-slate-600 block mb-1">
                  Level {level}
                </span>
                <span className="text-xs text-slate-400">
                  {LEVEL_XP - (profile.total_xp % LEVEL_XP)} XP to next level
                </span>
              </div>

              <span className="text-2xl font-bold text-[#f59e0b]">
                {profile.total_xp} XP
              </span>
            </div>

            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] h-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <p className="text-4xl font-bold text-slate-900 mb-2">
                {stats.sessions}
              </p>
              <p className="text-slate-500 text-sm font-medium">Sessions</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <p className="text-4xl font-bold text-slate-900 mb-2">
                {Math.floor(stats.minutes / 60)}h {stats.minutes % 60}m
              </p>
              <p className="text-slate-500 text-sm font-medium">Focus Time</p>
            </div>
          </div>

          {/* Logout */}
          <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm">
            <button
              onClick={handleLogout}
              className="w-full text-red-600 hover:bg-red-50 py-3 rounded-xl font-medium transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
