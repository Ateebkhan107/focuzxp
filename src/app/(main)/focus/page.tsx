// Focus page: timer, XP, encouragement, and task management
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_TIME = 25 * 60; // 25 minutes
const XP_PER_SESSION = 250;
const LEVEL_XP = 500;

// Encouragement checkpoints
const CHECKPOINTS = [
  { minute: 5, messages: ["Nice start. You're building momentum 💪", "Good focus. Keep going ✨"] },
  { minute: 10, messages: ["You're 40% in — stay sharp 🔥", "Focus streak forming 🧠"] },
  { minute: 15, messages: ["Halfway there. Don't break the flow 🚀", "Great discipline so far 💎"] },
  { minute: 20, messages: ["Almost done. Finish strong 🏁", "Stay with it — you're close ⏳"] },
];

type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export default function Focus() {
  const [time, setTime] = useState(DEFAULT_TIME);
  const [running, setRunning] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [totalXP, setTotalXP] = useState(0);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");

  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [shownCheckpoints, setShownCheckpoints] = useState<number[]>([]);

  /* ================= Load user + data ================= */
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (!data.user) return;

      // Load XP safely
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
        const elapsedMinutes = Math.floor((DEFAULT_TIME - newTime) / 60);

        CHECKPOINTS.forEach((cp) => {
          if (elapsedMinutes === cp.minute && !shownCheckpoints.includes(cp.minute)) {
            const msg = cp.messages[Math.floor(Math.random() * cp.messages.length)];
            setEncouragement(msg);
            setShownCheckpoints((p) => [...p, cp.minute]);
            setTimeout(() => setEncouragement(null), 6000);
          }
        });

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, time, shownCheckpoints]);

  /* ================= Tasks ================= */
  async function addTask() {
    if (!taskInput.trim()) return;

    if (!user) {
      setTasks([...tasks, { id: crypto.randomUUID(), title: taskInput, completed: false }]);
    } else {
      const { data } = await supabase
        .from("tasks")
        .insert({ user_id: user.id, title: taskInput })
        .select()
        .single();

      if (data) setTasks([...tasks, data]);
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

  /* ================= Session completion ================= */
  async function completeSession() {
    setRunning(false);
    setTime(DEFAULT_TIME);
    setShownCheckpoints([]);
    setEncouragement(null);

    if (!user) return;

    // ✅ SAFE XP INCREMENT (NO OVERWRITE)
    const { error } = await supabase.rpc("add_xp", {
      amount: XP_PER_SESSION,
    });

    if (error) {
      console.error(error.message);
      alert("Failed to save XP");
      return;
    }

    // Refresh XP from DB
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp")
      .eq("id", user.id)
      .maybeSingle();

    setTotalXP(profile?.total_xp ?? 0);
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
            <h1 className="text-xl sm:text-2xl font-semibold mb-6">Focus Session</h1>

            <div className="text-5xl sm:text-6xl font-mono font-bold mb-6">
              {Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}
            </div>

            {encouragement && (
              <div className="mb-6 text-blue-600 font-medium text-lg">
                {encouragement}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setRunning(!running)}
                className={`px-6 py-3 rounded-xl text-white ${
                  running ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {running ? "Stop" : "Start"}
              </button>

              <button
                onClick={() => {
                  setRunning(false);
                  setTime(DEFAULT_TIME);
                  setShownCheckpoints([]);
                  setEncouragement(null);
                }}
                className="border px-6 py-3 rounded-xl hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
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
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl"
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
                  <button onClick={() => deleteTask(task.id)}>✕</button>
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
