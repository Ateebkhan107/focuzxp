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
  created_at?: string;
};

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISO() {
  return isoDate(new Date());
}

function getPriorityColor(priority?: string) {
  if (priority === "high") return "bg-red-50 border-red-200 text-red-700";
  if (priority === "low") return "bg-slate-50 border-slate-200 text-slate-700";
  return "bg-amber-50 border-amber-200 text-amber-800";
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export default function PlannerPage() {
  const [user, setUser] = useState<any>(null);

  // Month being shown in calendar
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()));

  // selected date for task panel
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const selectedISO = useMemo(() => isoDate(selectedDate), [selectedDate]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // add task form
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [duration, setDuration] = useState(25);

  async function loadUserAndMonthTasks(month: Date) {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const u = data.user;
    setUser(u);

    if (!u) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Load tasks for visible month only (fast)
    const start = isoDate(startOfMonth(month));
    const end = isoDate(endOfMonth(month));

    const { data: taskData, error } = await supabase
      .from("tasks")
      .select("id, title, completed, priority, due_date, duration_min, spent_min, created_at")
      .eq("user_id", u.id)
      .gte("due_date", start)
      .lte("due_date", end)
      .order("due_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error.message);
      setTasks([]);
      setLoading(false);
      return;
    }

    setTasks((taskData ?? []) as Task[]);
    setLoading(false);
  }

  // load on mount + when month changes
  useEffect(() => {
    loadUserAndMonthTasks(monthDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDate]);

  // ✅ tasks for selected day
  const selectedTasks = useMemo(() => {
    return tasks.filter((t) => (t.due_date ?? "") === selectedISO);
  }, [tasks, selectedISO]);

  // ✅ map counts for dots on calendar
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      const d = t.due_date;
      if (!d) continue;
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  // ✅ build month grid
  const calendarCells = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    const firstDayIndex = start.getDay(); // 0 sun
    const totalDays = end.getDate();

    const cells: { date: Date | null; key: string }[] = [];

    // blanks
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ date: null, key: `empty-${i}` });
    }

    // month days
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      cells.push({ date: d, key: isoDate(d) });
    }

    return cells;
  }, [monthDate]);

  async function addTask() {
    if (!title.trim()) return;

    if (!user) {
      alert("Please login to use planner.");
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        due_date: selectedISO, // ✅ selected date
        priority,
        duration_min: duration,
        spent_min: 0,
      })
      .select("id, title, completed, priority, due_date, duration_min, spent_min, created_at")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setTasks((prev) => [...prev, data as Task]);
  }

  async function toggleTask(task: Task) {
    if (!user) return;

    // UI first
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );

    const { error } = await supabase
      .from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (error) alert(error.message);
  }

  async function deleteTask(taskId: string) {
    if (!user) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    const { error } = await supabase.from("tasks").delete().eq("id", taskId).eq("user_id", user.id);
    if (error) alert(error.message);
  }

  const monthLabel = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const today = todayISO();

  return (
    <main className="min-h-screen bg-[#f8fafc] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Planner</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Calendar planning + daily tasks (real productivity system)
          </p>
        </div>

        {!user && !loading && (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
            <p className="text-slate-700 font-medium mb-2">Login required</p>
            <p className="text-slate-500 text-sm mb-4">
              Planner needs account to store tasks.
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition"
            >
              Login →
            </a>
          </div>
        )}

        {/* Main Layout */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMonthDate((d) => addMonths(d, -1))}
                  className="px-3 py-2 rounded-xl border hover:bg-slate-50 transition"
                >
                  ←
                </button>

                <h2 className="text-lg font-bold text-slate-900">{monthLabel}</h2>

                <button
                  onClick={() => setMonthDate((d) => addMonths(d, 1))}
                  className="px-3 py-2 rounded-xl border hover:bg-slate-50 transition"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 text-xs font-semibold text-slate-500 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center py-2">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                  if (!cell.date) return <div key={cell.key} className="h-14 sm:h-16" />;

                  const key = cell.key;
                  const dayNum = cell.date.getDate();
                  const isToday = key === today;
                  const isSelected = key === selectedISO;
                  const count = countByDate.get(key) ?? 0;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(cell.date!)}
                      className={`h-14 sm:h-16 rounded-xl border text-sm flex flex-col items-center justify-center relative transition
                        ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white hover:bg-slate-50 border-slate-200"
                        }
                      `}
                    >
                      <span className={`${isToday && !isSelected ? "text-blue-600 font-bold" : ""}`}>
                        {dayNum}
                      </span>

                      {count > 0 && (
                        <span
                          className={`absolute bottom-2 w-5 h-5 rounded-full text-[10px] flex items-center justify-center
                            ${isSelected ? "bg-white text-blue-700" : "bg-blue-600 text-white"}
                          `}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Selected date: <span className="font-semibold">{selectedISO}</span>
              </div>
            </section>

            {/* Daily Tasks Panel */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
                <p className="text-xs text-slate-500">
                  For <span className="font-semibold">{selectedISO}</span>
                </p>
              </div>

              {/* Add Task */}
              <div className="space-y-2 mb-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full border rounded-xl px-4 py-2.5"
                />

                <div className="grid grid-cols-2 gap-2">
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
                </div>

                <button
                  onClick={addTask}
                  className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-medium hover:bg-blue-700 transition"
                >
                  Add Task
                </button>
              </div>

              {loading && <p className="text-slate-500 text-sm">Loading…</p>}

              {/* Task list */}
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {selectedTasks.map((task) => {
                  const spent = task.spent_min ?? 0;
                  const target = task.duration_min ?? 25;
                  const percent = Math.min(100, Math.floor((spent / target) * 100));

                  return (
                    <div
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
                    </div>
                  );
                })}

                {!loading && selectedTasks.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No tasks on this date.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
