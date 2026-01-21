// Focus page: timer, XP, encouragement, and task management (PRODUCTION READY)
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

// XP / level config
const XP_PER_SESSION = 250;
const LEVEL_XP = 500;

// Default focus minutes if user hasn't changed
const DEFAULT_FOCUS_MINUTES = 25;

// Encouragement checkpoints (in minutes)
const CHECKPOINTS = [
  {
    minute: 5,
    messages: ["Nice start. You're building momentum 💪", "Good focus. Keep going ✨"],
  },
  {
    minute: 10,
    messages: ["You're 40% in — stay sharp 🔥", "Focus streak forming 🧠"],
  },
  {
    minute: 15,
    messages: ["Halfway there. Don't break the flow 🚀", "Great discipline so far 💎"],
  },
  {
    minute: 20,
    messages: ["Almost done. Finish strong 🏁", "Stay with it — you're close ⏳"],
  },
];

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export default function Focus() {
  // ----------------- Custom Timer Settings -----------------
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const focusSeconds = useMemo(() => focusMinutes * 60, [focusMinutes]);

  // ----------------- Timer State -----------------
  const [time, setTime] = useState(focusSeconds);
  const [running, setRunning] = useState(false);

  // ----------------- User & XP -----------------
  const [user, setUser] = useState<any>(null);
  const [totalXP, setTotalXP] = useState(0);

  // ----------------- Tasks -----------------
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  // ----------------- Encouragement -----------------
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [shownCheckpoints, setShownCheckpoints] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);

  /* ================= Load settings from localStorage ================= */
  useEffect(() => {
    const stored = localStorage.getItem("focuzxp_focus_minutes");
    if (stored) {
      const val = Number(stored);
      if (!Number.isNaN(val) && val >= 10 && val <= 180) {
        setFocusMinutes(val);
        setTime(val * 60);
      }
    }
  }, []);

  /* ================= Load user + data ================= */
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (!data.user) return;

      // Load XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_xp")
        .eq("id", data.user.id)
        .maybeSingle();

      setTotalXP(profile?.total_xp ?? 0);

      // Load tasks
      const { data: taskData } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at");

      setTasks(taskData ?? []);
    }

    load();
  }, []);

  /* ================= When focusMinutes changes, reset timer (only if not running) ================= */
  useEffect(() => {
    if (!running) setTime(focusSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeconds]);

  /* ================= Timer logic ================= */
  useEffect(() => {
    if (!running) return;

    if (time === 0) {
      completeSession();
      return;
    }

    const timer = setInterval(() => {
      setTime((prev) => {
        const newTime = prev - 1;

        // elapsedMinutes based on current focusSeconds
        const elapsedMinutes = Math.floor((focusSeconds - newTime) / 60);

        CHECKPOINTS.forEach((cp) => {
          if (cp.minute < focusMinutes) {
            if (elapsedMinutes === cp.minute && !shownCheckpoints.includes(cp.minute)) {
              const msg = cp.messages[Math.floor(Math.random() * cp.messages.length)];
              setEncouragement(msg);
              setShownCheckpoints((p) => [...p, cp.minute]);
              setTimeout(() => setEncouragement(null), 6000);
            }
          }
        });

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, time, shownCheckpoints, focusSeconds, focusMinutes]);

  /* ================= Tasks ================= */
  async function addTask() {
    if (!taskInput.trim()) return;

    if (!user) {
      setTasks([...tasks, { id: crypto.randomUUID(), title: taskInput, completed: false }]);
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ user_id: user.id, title: taskInput })
        .select()
        .single();

      if (!error && data) setTasks([...tasks, data]);
    }

    setTaskInput("");
  }

  async function toggleTask(task: Task) {
    if (!user) {
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    } else {
      await supabase.from("tasks").update({ completed: !task.completed }).eq("id", task.id);
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));
    }
  }

  async function deleteTask(id: string) {
    if (user) await supabase.from("tasks").delete().eq("id", id);
    setTasks(tasks.filter((t) => t.id !== id));
  }

  /* ================= Session completion (IMPORTANT) ================= */
  async function completeSession() {
    setRunning(false);
    setTime(focusSeconds);
    setShownCheckpoints([]);
    setEncouragement(null);

    // ✅ Guest mode: no database save
    if (!user) return;

    if (saving) return; // prevent double save
    setSaving(true);

    try {
      // ✅ 1) Insert into focus_sessions table (THIS FIXES LEADERBOARD/STATS)
      const { error: sessionError } = await supabase.from("focus_sessions").insert({
        user_id: user.id,
        minutes: focusMinutes,
        xp_earned: XP_PER_SESSION,
      });

      if (sessionError) {
        console.error("focus_sessions insert error:", sessionError.message);
        alert("Session save failed. Check RLS for focus_sessions.");
        setSaving(false);
        return;
      }

      // ✅ 2) Add XP safely (RPC)
      const { error: xpError } = await supabase.rpc("add_xp", {
        amount: XP_PER_SESSION,
      });

      if (xpError) {
        console.error("add_xp rpc error:", xpError.message);
        alert("XP update failed. Check RPC function + RLS.");
        setSaving(false);
        return;
      }

      // ✅ 3) Refresh XP from DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_xp")
        .eq("id", user.id)
        .maybeSingle();

      setTotalXP(profile?.total_xp ?? 0);
    } finally {
      setSaving(false);
    }
  }

  /* ================= Helpers ================= */
  function handleReset() {
    setRunning(false);
    setTime(focusSeconds);
    setShownCheckpoints([]);
    setEncouragement(null);
  }

  function saveSettings() {
    let val = focusMinutes;
    if (val < 10) val = 10;
    if (val > 180) val = 180;

    setFocusMinutes(val);
    localStorage.setItem("focuzxp_focus_minutes", String(val));

    if (!running) setTime(val * 60);

    setSettingsOpen(false);
  }

  const level = Math.floor(totalXP / LEVEL_XP) + 1;
  const progressPercent = ((totalXP % LEVEL_XP) / LEVEL_XP) * 100;

  /* ================= UI ================= */
  return (
    <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {/* Timer Card */}
          <div className="bg-white border rounded-2xl p-6 sm:p-8 text-center shadow-md">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl sm:text-2xl font-semibold">Focus Session</h1>

              <button
                onClick={() => setSettingsOpen(true)}
                className="text-sm px-3 py-1.5 rounded-xl border hover:bg-slate-50 transition"
              >
                ⚙️ Settings
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              Current duration: <span className="font-semibold">{focusMinutes} min</span>
            </p>

            <div className="text-5xl sm:text-6xl font-mono font-bold mb-6">
              {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
            </div>

            {encouragement && (
              <div className="mb-6 text-blue-600 font-medium text-lg">{encouragement}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setRunning(!running)}
                disabled={saving}
                className={`px-6 py-3 rounded-xl text-white transition disabled:opacity-50 ${
                  running ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {running ? "Stop" : "Start"}
              </button>

              <button
                onClick={handleReset}
                disabled={saving}
                className="border px-6 py-3 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            {/* Settings Modal */}
            {settingsOpen && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900">Timer Settings</h2>
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="text-slate-400 hover:text-slate-700 transition"
                      aria-label="Close settings"
                    >
                      ✕
                    </button>
                  </div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Focus duration (minutes)
                  </label>

                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={focusMinutes}
                    onChange={(e) => setFocusMinutes(Number(e.target.value))}
                    className="w-full border rounded-xl px-4 py-3 mb-3"
                  />

                  <p className="text-xs text-slate-500 mb-5">Recommended: 25 / 50 / 90 minutes</p>

                  {running && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                      Timer is running. Settings will apply after reset / next session.
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={saveSettings}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
                    >
                      Save
                    </button>

                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="flex-1 border py-3 rounded-xl hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* XP Card */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Level {level}</span>
              <span className="text-sm font-bold text-amber-500">{totalXP} XP</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 to-yellow-400 h-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {!user && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                Login to save XP + session history
              </p>
            )}
          </div>

          {/* Tasks */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Tasks</h2>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="What will you focus on?"
                className="flex-1 border rounded-xl px-4 py-2.5"
              />
              <button
                onClick={addTask}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition"
              >
                Add
              </button>
            </div>

            <ul className="space-y-2">
              {tasks.map((task) => (
                <li key={task.id} className="flex justify-between p-3 rounded-xl border">
                  <label className="flex gap-3 items-center">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                    />
                    <span className={task.completed ? "line-through text-slate-400" : ""}>
                      {task.title}
                    </span>
                  </label>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-400 hover:text-red-600 transition"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {tasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-4">
                No tasks yet. Add one to get started!
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
