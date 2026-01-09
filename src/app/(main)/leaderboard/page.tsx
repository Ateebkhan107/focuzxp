"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  total_xp: number;
};

const LEVEL_XP = 500;

export default function Leaderboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load leaderboard data
  async function loadLeaderboard(isLoggedIn?: boolean) {
    const limit = isLoggedIn ? 50 : 5;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, total_xp")
      .order("total_xp", { ascending: false })
      .limit(limit);

    if (!error) setProfiles(data ?? []);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      // ✅ Get session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const isLoggedIn = !!session;
      setLoggedIn(isLoggedIn);
      setUserId(session?.user?.id ?? null);

      // ✅ Load leaderboard
      await loadLeaderboard(isLoggedIn);
      setLoading(false);
    }

    init();

    // ✅ Listen auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const isLoggedIn = !!session;
      setLoggedIn(isLoggedIn);
      setUserId(session?.user?.id ?? null);

      await loadLeaderboard(isLoggedIn);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ OPTIONAL BEST FEATURE: Realtime refresh when profile XP updates
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        async () => {
          await loadLeaderboard(loggedIn);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loggedIn]);

  const myRank = useMemo(() => {
    if (!loggedIn || !userId) return null;

    const index = profiles.findIndex((p) => p.id === userId);
    if (index === -1) return null;

    const me = profiles[index];
    const level = Math.floor(me.total_xp / LEVEL_XP) + 1;
    const progress = ((me.total_xp % LEVEL_XP) / LEVEL_XP) * 100;

    return { index, me, level, progress };
  }, [profiles, loggedIn, userId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
        <div className="text-center text-slate-500">Loading leaderboard…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-6 text-center">
          Leaderboard
        </h1>

        {/* Rank Card (Logged-in only) */}
        {loggedIn && myRank && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Your Rank
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  #{myRank.index + 1}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">
                  {myRank.me.username ?? "You"}
                </p>
                <p className="text-xs text-slate-500">
                  Level {myRank.level} • {myRank.me.total_xp} XP
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-700"
                style={{ width: `${myRank.progress}%` }}
              />
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {Math.ceil(LEVEL_XP - (myRank.me.total_xp % LEVEL_XP))} XP to next
              level
            </p>
          </div>
        )}

        {/* Login Prompt */}
        {!loggedIn && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-blue-700 mb-2">
              Login to see the full leaderboard and your rank
            </p>
            <Link
              href="/login"
              className="text-blue-600 font-medium hover:underline"
            >
              Login →
            </Link>
          </div>
        )}

        {/* Leaderboard List */}
        <div
          className={`space-y-3 ${
            !loggedIn ? "blur-sm pointer-events-none select-none" : ""
          }`}
        >
          {profiles.map((user, index) => {
            const isTop1 = index === 0;
            const isTop2 = index === 1;
            const isTop3 = index === 2;

            return (
              <div
                key={user.id}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-xl shadow-sm border
                  transition-all duration-200 hover:scale-[1.01]
                  ${
                    isTop1
                      ? "bg-yellow-50 border-yellow-300"
                      : isTop2
                      ? "bg-slate-100 border-slate-300"
                      : isTop3
                      ? "bg-orange-50 border-orange-300"
                      : "bg-white border-slate-200"
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold w-6 text-center">
                    {isTop1 && "🥇"}
                    {isTop2 && "🥈"}
                    {isTop3 && "🥉"}
                    {!isTop1 && !isTop2 && !isTop3 && `#${index + 1}`}
                  </span>

                  <span className="font-medium text-slate-800">
                    {user.username ?? "Anonymous"}
                  </span>
                </div>

                <span className="text-sm font-semibold text-blue-600">
                  {user.total_xp} XP
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
