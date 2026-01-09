"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const LEVEL_XP = 500;

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    }); 
 
    return () => subscription.unsubscribe();
  }, []);

  const primaryHref = loggedIn ? "/focus" : "/login";

  // Demo XP for logged-out users
  const demoXP = 1250;
  const demoLevel = Math.floor(demoXP / LEVEL_XP) + 1;
  const demoProgress = ((demoXP % LEVEL_XP) / LEVEL_XP) * 100;

  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* ================= HERO ================= */}
        <section
          className={`max-w-3xl mx-auto text-center mt-12 transition-all duration-300 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Turn Focus into{" "}
            <span className="text-blue-600">Progress</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 mb-4 leading-relaxed">
            A calm, gamified focus platform that helps you build deep work habits.
          </p>

          <p className="text-sm sm:text-base text-slate-500 mb-10 leading-relaxed max-w-lg mx-auto">
            Earn XP, level up, and climb the leaderboard through consistent focus
            sessions. Turn focused time into visible progress.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-14">
            <Link
              href={primaryHref}
              className="
                bg-blue-600 text-white
                px-8 py-3 rounded-xl font-medium
                hover:bg-blue-700 active:scale-95
                transition-all duration-300
                shadow-md hover:shadow-lg
                min-h-[44px] flex items-center justify-center
              "
            >
              {loggedIn ? "Start Focusing" : "Get Started"}
            </Link>

            {loggedIn && (
              <Link
                href="/leaderboard"
                className="
                  border-2 border-blue-600 text-blue-600
                  px-8 py-3 rounded-xl font-medium
                  hover:bg-blue-50 active:scale-95
                  transition-all duration-300
                  min-h-[44px] flex items-center justify-center
                "
              >
                View Leaderboard
              </Link>
            )}
          </div>

          {/* Demo XP Card (Logged Out) */}
          {!loggedIn && (
            <div
              className={`bg-white border border-slate-200 rounded-2xl p-6 max-w-md mx-auto shadow-sm transition-all duration-500 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "150ms" }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-700">
                  Level {demoLevel}
                </span>
                <span className="text-sm font-medium text-amber-500">
                  {demoXP} XP
                </span>
              </div>

              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-1000"
                  style={{ width: `${demoProgress}%` }}
                />
              </div>

              <p className="text-xs text-slate-500 mt-3 text-center">
                Log in to start earning XP and tracking your progress
              </p>
            </div>
          )}
        </section>

        {/* ================= FEATURES ================= */}
        <section
          className={`mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          <Feature
            icon="⏱"
            title="Deep Focus Sessions"
            text="Work distraction-free using timed focus sessions designed for deep work."
          />
          <Feature
            icon="⭐"
            title="Earn XP & Levels"
            text="Every completed session earns XP, helping you level up and see real progress."
          />
          <Feature
            icon="🏆"
            title="Friendly Competition"
            text="Stay consistent by competing on leaderboards with others who value focus."
          />
        </section>

        {/* ================= WHY IT WORKS ================= */}
        <section
          className={`mt-20 max-w-2xl mx-auto text-center transition-all duration-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "450ms" }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Why FocuzXP Works
          </h2>
          <p className="text-slate-500 leading-relaxed">
            FocuzXP is built on psychology, not pressure. By turning focused time
            into visible progress, it helps you stay consistent and motivated
            every day.
          </p>
        </section>
      </div>
    </main>
  );
}

/* ================= Feature Card ================= */

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
