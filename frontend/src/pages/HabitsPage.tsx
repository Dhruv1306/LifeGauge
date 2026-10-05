import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { HabitMatrix } from "../components/charts/HabitMatrix";
import { HabitCreateModal } from "../components/habits/HabitCreateModal";
import { Flame, Plus, Trash2, Calendar } from "lucide-react";

interface HabitItem {
  id: string;
  title: string;
  targetDays: string;
  isActive: boolean;
  createdAt: string;
}

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchHabits = async () => {
    try {
      const res = await api.get("/habits");
      if (res.data.success) {
        setHabits(res.data.habits);
      }
    } catch (err) {
      console.error("Failed to load habits", err);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [refreshKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this habit and all its history?")) return;
    try {
      await api.delete(`/habits/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to delete habit", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-400" />
              Habits & Consistency Matrix
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Build daily momentum and review your routines on the LeetCode / GitHub style punchcard grid.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Habit</span>
          </button>
        </div>

        {/* Embedded Habit Matrix */}
        <HabitMatrix key={refreshKey} onHabitToggled={() => setRefreshKey((k) => k + 1)} />

        {/* Active Habits List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <h3 className="text-base font-semibold text-white mb-4">Configured Habits</h3>

          {habits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No habits configured yet. Click &ldquo;New Habit&rdquo; to start tracking.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {habits.map((habit) => (
                <div key={habit.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white">{habit.title}</h4>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mt-0.5">
                      <Calendar className="h-3 w-3 text-amber-400" />
                      Frequency: {habit.targetDays === "ALL" ? "Everyday (7 Days)" : habit.targetDays}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(habit.id)}
                    title="Delete Habit"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <HabitCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};
