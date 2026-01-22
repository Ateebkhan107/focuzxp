"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getPriorityColor(priority?: string) {
  if (priority === "high") return "bg-red-50 border-red-200 text-red-700";
  if (priority === "low") return "bg-slate-50 border-slate-200 text-slate-700";
  return "bg-amber-50 border-amber-200 text-amber-800";
}

export default function PlannerPage() {
  const [user, setUser] = useState<any>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Task form
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [duration, setDuration] = useState(25);

  async function loadUserAndTasks() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    setUser(data.user);

    if (!data.user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data: taskData } = await supabase
      .from("tasks")
      .select("id, title, completed, priority, due_date, duration_min, spent_min, created_at")
      .eq("user_id", data.user.id)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: true });

    setTasks((taskData ?? []) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    loadUserAndTasks();
  }, []);

  async function addTask() {
    if (!title.trim()) return;

    if (!user) {
      alert("Please login to use planner.");
      return;
    }

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      due_date: dueDate,
      priority,
      duration_min: duration,
      spent_min: 0,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    await loadUserAndTasks();
  }

  async function toggleTask(task: Task) {
    if (!user) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );

    await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .eq("user_id", user.id);
  }

  async function deleteTask(taskId: string) {
    if (!user) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
  }

  // Group tasks by due_date
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const date = t.due_date ?? "No Date";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(t);
    });

    // sort dates
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted;
  }, [tasks]);

  const today = todayISO();

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">Planner</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Plan tasks by date like a real productivity app
            </p>
          </div>

          {/* Add task card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Add Task</h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="sm:col-span-2 border rounded-xl px-4 py-2.5"
              />

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="border rounded-xl px-3 py-2.5"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="sm:col-span-2 border rounded-xl px-3 py-2.5"
              />

              <button
                onClick={addTask}
                className="sm:col-span-2 bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700 transition"
              >
                Add to Planner
              </button>
            </div>
          </div>

          {/* Planner list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Tasks by Date</h2>
              <span className="text-xs text-slate-500">
                {user ? "Synced with account ✅" : "Login required for planner"}
              </span>
            </div>

            {loading && <p className="text-slate-500 text-sm">Loading…</p>}

            {!loading && grouped.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">
                No tasks planned yet.
              </p>
            )}

            <div className="space-y-6">
              {grouped.map(([date, list]) => {
                const isToday = date === today;

                return (
                  <div key={date}>
                    <div
                      className={`flex items-center justify-between mb-2 ${
                        isToday ? "text-blue-700" : "text-slate-700"
                      }`}
                    >
                      <h3 className="font-semibold">
                        {date} {isToday ? "(Today)" : ""}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {list.length} tasks
                      </span>
                    </div>

                    <ul className="space-y-2">
                      {list.map((task) => {
                        const spent = task.spent_min ?? 0;
                        const target = task.duration_min ?? 25;
                        const percent = Math.min(100, Math.floor((spent / target) * 100));

                        return (
                          <li
                            key={task.id}
                            className="border border-slate-200 rounded-xl p-3 hover:shadow-sm transition"
                          >
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
                                      task.completed
                                        ? "line-through text-slate-400"
                                        : "text-slate-800"
                                    }`}
                                  >
                                    {task.title}
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                    <span
                                      className={`text-xs px-2 py-1 rounded-lg border ${getPriorityColor(
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

                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-xs px-3 py-2 rounded-xl border text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tip */}
          <div className="text-center text-xs text-slate-400">
            Next step: we will add a real calendar grid 📅
          </div>
        </div>
      </div>
    </main>
  );
}
