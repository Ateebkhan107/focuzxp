// Focus page: timer, XP, encouragement, and task management (PRODUCTION READY + IMPROVED TASKS)
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
  priority?: "low" | "medium" | "high" | string;
  due_date?: string | null;
  duration_min?: number | null;
  spent_min?: number | null;
};

function todayISO() {
  // local date -> YYYY-MM-DD
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getPriorityStyles(priority?: string) {
  if (priority === "high") return "bg-red-50 border-red-200 text-red-700";
  if (priority === "low") return "bg-slate-50 border-slate-200 text-slate-700";
  return "bg-amber-50 border-amber-200 text-amber-800"; // medium default
}

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
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [taskDuration, setTaskDuration] = useState<number>(25);
  const [taskDueDate, setTaskDueDate] = useState<string>(todayISO());

  // ----------------- Encouragement -----------------
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [shownCheckpoints, setShownCheckpoints] = useState<number[]>([]);

  // session saving
  const [saving, setSaving] = useState(false);

  // optional: “active task”
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  /* ================= Load timer settings from localStorage ================= */
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

  /* ================= Load user + XP + tasks ================= */
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (!data.user) {
        setTasks([]);
        return;
      }

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
        .select("id, title, completed, priority, due_date, duration_min, spent_min, created_at")
        .eq("user_id", data.user.id)
        .order("created_at");

      setTasks((taskData ?? []) as Task[]);
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
  async function reloadTasks() {
    if (!user) return;
    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title, completed, priority, due_date, duration_min, spent_min, created_at")
      .eq("user_id", user.id)
      .order("created_at");
    setTasks((taskData ?? []) as Task[]);
  }

  async function addTask() {
    if (!taskInput.trim()) return;

    if (!user) {
      // guests: local only
      setTasks([
        ...tasks,
        {
          id: crypto.randomUUID(),
          title: taskInput.trim(),
          completed: false,
          priority: taskPriority,
          duration_min: taskDuration,
          due_date: taskDueDate,
          spent_min: 0,
        },
      ]);
      setTaskInput("");
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: taskInput.trim(),
        priority: taskPriority,
        duration_min: taskDuration,
        due_date: taskDueDate,
        spent_min: 0,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (data) setTasks([...tasks, data as Task]);
    setTaskInput("");
  }

  async function toggleTask(task: Task) {
    // optimistic UI
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)));

    if (!user) return;

    await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .eq("user_id", user.id);
  }

  async function deleteTask(id: string) {
    setTasks(tasks.filter((t) => t.id !== id));

    if (!user) return;
    await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
  }

  async function startFocusForTask(taskId: string, durationMin?: number | null) {
    setActiveTaskId(taskId);

    // if timer is not running, optionally sync duration to task duration
    if (!running && durationMin && durationMin >= 10 && durationMin <= 180) {
      setFocusMinutes(durationMin);
      localStorage.setItem("focuzxp_focus_minutes", String(durationMin));
      setTime(durationMin * 60);
    }

    setRunning(true);
  }

  /* ================= Session completion ================= */
  async function completeSession() {
    setRunning(false);
    setTime(focusSeconds);
    setShownCheckpoints([]);
    setEncouragement(null);

    if (!user) {
      // guest: no DB save
      setActiveTaskId(null);
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      // 1) focus_sessions insert
      const { error: sessionError } = await supabase.from("focus_sessions").insert({
        user_id: user.id,
        minutes: focusMinutes,
        xp_earned: XP_PER_SESSION,
      });

      if (sessionError) {
        alert("Session save failed. Check RLS focus_sessions.");
        return;
      }

      // 2) XP update
      const { error: xpError } = await supabase.rpc("add_xp", { amount: XP_PER_SESSION });

      if (xpError) {
        alert("XP update failed. Check RPC add_xp.");
        return;
      }

      // 3) If task was active, add spent minutes
      if (activeTaskId) {
        await supabase
          .from("tasks")
          .update({
            spent_min: (tasks.find((t) => t.id === activeTaskId)?.spent_min ?? 0) + focusMinutes,
          })
          .eq("id", activeTaskId)
          .eq("user_id", user.id);
      }

      // refresh XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_xp")
        .eq("id", user.id)
        .maybeSingle();

      setTotalXP(profile?.total_xp ?? 0);
      await reloadTasks();
      setActiveTaskId(null);
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
    setActiveTaskId(null);
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

  // Today tasks
  const today = todayISO();
  const todayTasks = tasks.filter((t) => (t.due_date ?? today) === today);
  const plannedTasks = tasks.filter((t) => t.due_date && t.due_date !== today);

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

            {activeTaskId && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl mb-3">
                Active task:{" "}
                <span className="font-semibold">
                  {tasks.find((t) => t.id === activeTaskId)?.title ?? "Task"}
                </span>
              </p>
            )}

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
              <p className="text-xs text-slate-500 mt-2 text-center">Login to save XP + history</p>
            )}
          </div>

          {/* Tasks (Upgraded) */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Today’s Plan</h2>
              <p className="text-xs text-slate-500">{today}</p>
            </div>

            {/* Add Task */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Task title"
                className="sm:col-span-2 border rounded-xl px-4 py-2.5"
              />

              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as any)}
                className="border rounded-xl px-3 py-2.5"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={taskDuration}
                onChange={(e) => setTaskDuration(Number(e.target.value))}
                className="border rounded-xl px-3 py-2.5"
              >
                <option value={15}>15 min</option>
                <option value={25}>25 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>

              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="border rounded-xl px-3 py-2.5 sm:col-span-2"
              />

              <button
                onClick={addTask}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition sm:col-span-2"
              >
                Add Task
              </button>
            </div>

            {/* Today tasks */}
            <ul className="space-y-2">
              {todayTasks.map((task) => {
                const spent = task.spent_min ?? 0;
                const target = task.duration_min ?? 25;
                const percent = Math.min(100, Math.floor((spent / target) * 100));

                return (
                  <li key={task.id} className="p-3 rounded-xl border">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex gap-3 items-start flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTask(task)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              task.completed ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {task.title}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <span
                              className={`text-xs px-2 py-1 rounded-lg border ${getPriorityStyles(
                                task.priority
                              )}`}
                            >
                              {task.priority ?? "medium"} priority
                            </span>

                            <span className="text-xs px-2 py-1 rounded-lg border bg-slate-50 text-slate-700">
                              🎯 {target} min
                            </span>

                            <span className="text-xs text-slate-500">
                              Progress: {spent}/{target} min
                            </span>
                          </div>

                          <div className="mt-2 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </label>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => startFocusForTask(task.id, task.duration_min)}
                          className="text-xs px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition"
                        >
                          Start Focus
                        </button>

                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-xs px-3 py-2 rounded-xl border text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {todayTasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-4">
                No tasks for today. Add your plan 👇
              </p>
            )}

            {/* Planned */}
            {plannedTasks.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-slate-700 mt-6 mb-2">Upcoming</h3>
                <ul className="space-y-2">
                  {plannedTasks.slice(0, 6).map((task) => (
                    <li key={task.id} className="p-3 rounded-xl border bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{task.title}</p>
                          <p className="text-xs text-slate-500">
                            📅 {task.due_date} • 🎯 {task.duration_min ?? 25} min •{" "}
                            {task.priority ?? "medium"} priority
                          </p>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-xs px-3 py-2 rounded-xl border text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
