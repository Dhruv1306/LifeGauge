import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { HabitMatrix } from "../components/charts/HabitMatrix";
import { HabitCreateModal } from "../components/habits/HabitCreateModal";
import { HabitEditModal } from "../components/habits/HabitEditModal";
import { WindowDialogUpdation } from "../components/common/WindowDialogUpdation";
import {
  Flame,
  Plus,
  Trash2,
  Calendar,
  Pencil,
  GripVertical,
} from "lucide-react";

interface HabitItem {
  id: string;
  title: string;
  targetDays: string;
  startDate?: string | null;
  endDate?: string | null;
  order?: number;
  isActive?: boolean;
  createdAt: string;
  periods?: Array<{ startDate: string; endDate: string }>;
}

function formatTargetDays(targetDays: string): string {
  if (targetDays === "ALL") return "Everyday (7 Days)";
  return targetDays
    .split(",")
    .map((day) => {
      const normalized = day.trim().toLowerCase();
      return normalized ? normalized[0].toUpperCase() + normalized.slice(1, 3) : "";
    })
    .filter(Boolean)
    .join(", ");
}

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [completedHabits, setCompletedHabits] = useState<HabitItem[]>([]);
  const [habitView, setHabitView] = useState<"configured" | "completed">("configured");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [resumingHabitId, setResumingHabitId] = useState<string | null>(null);

  const fetchHabits = async () => {
    try {
      const res = await api.get("/habits");
      const completedRes = await api.get("/habits/completed");
      if (res.data.success) {
        setHabits(res.data.habits);
      }
      if (completedRes.data.success) {
        setCompletedHabits(completedRes.data.habits);
      }
    } catch (err) {
      console.error("Failed to load habits", err);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, [refreshKey]);

  const handleReorder = async (newHabits: HabitItem[]) => {
    setHabits(newHabits);
    try {
      await api.put("/habits/reorder", {
        habitIds: newHabits.map((h) => h.id),
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to reorder habits", err);
      fetchHabits();
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const updated = [...habits];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    handleReorder(updated);
  };

  const handleDelete = async (id: string) => {
    setHabitToDelete(id);
  };

  const handleResume = async (id: string) => {
    setResumingHabitId(id);
    try {
      await api.post(`/habits/${id}/resume`, {
        startDate: new Date().toISOString().split("T")[0],
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to resume habit", err);
    } finally {
      setResumingHabitId(null);
    }
  };

  const confirmDelete = async () => {
    if (!habitToDelete) return;
    try {
      await api.delete(`/habits/${habitToDelete}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to delete habit", err);
    } finally {
      setHabitToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-400" />
              Habits & Consistency Matrix
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Build daily momentum and review your routines on the punchcard grid.
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
        <HabitMatrix refreshTrigger={refreshKey} />

        {/* Habit Lists */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
              <button
                type="button"
                onClick={() => setHabitView("configured")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  habitView === "configured"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Configured Habits
              </button>
              <button
                type="button"
                onClick={() => setHabitView("completed")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  habitView === "completed"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Completed Habits
              </button>
            </div>
            {habitView === "configured" && (
            <p className="mb-3 text-[11px] text-slate-400">
              Drag handles to reorder
            </p>
          )}
          </div>

          {(habitView === "configured" ? habits : completedHabits).length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {habitView === "configured"
                ? "No habits configured yet. Click “New Habit” to start tracking."
                : "No completed habits yet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {(habitView === "configured" ? habits : completedHabits).map((habit, index) => (
                <div
                  key={habit.id}
                  draggable={habitView === "configured"}
                  onDragStart={habitView === "configured" ? (e) => handleDragStart(e, index) : undefined}
                  onDragOver={habitView === "configured" ? handleDragOver : undefined}
                  onDrop={habitView === "configured" ? (e) => handleDrop(e, index) : undefined}
                  className={`configured-habit-row py-3 flex items-center justify-between gap-3 transition-colors ${
                    draggedIndex === index
                      ? "opacity-40 bg-slate-800/40 rounded-xl px-2"
                      : "hover:bg-slate-800/20 px-2 rounded-xl"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle */}
                    {habitView === "configured" ? (
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="w-6 shrink-0" aria-hidden="true" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {habit.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-400" />
                          {formatTargetDays(habit.targetDays)}
                        </span>
                        {habit.startDate && (
                          <span className="text-slate-500">
                            Started: {habit.startDate.split("T")[0]}
                          </span>
                        )}
                        {habitView === "completed" && habit.endDate && (
                          <span className="text-amber-500/80">
                            Completed: {habit.endDate.split("T")[0]}
                          </span>
                        )}
                        {habit.periods && habit.periods.length > 0 && (
                          <div className="basis-full mt-1">
                            <div className="text-slate-500">Previous working:</div>
                            <ol className="list-decimal pl-6 text-slate-500">
                              {habit.periods.map((period) => (
                                <li key={`${period.startDate}-${period.endDate}`}>
                                  {period.startDate} - {period.endDate}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {habitView === "completed" && (
                      <button
                        type="button"
                        onClick={() => handleResume(habit.id)}
                        disabled={resumingHabitId === habit.id}
                        title="Resume Habit"
                        className="habit-resume-icon rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-500/10"
                      >
                        {resumingHabitId === habit.id ? "Resuming..." : "Resume"}
                      </button>
                    )}
                    <button
                      onClick={() => setEditingHabit(habit)}
                      title="Edit Habit"
                      className="habit-edit-icon p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(habit.id)}
                      title="Delete Habit"
                      className="habit-delete-icon p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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

      <HabitEditModal
        isOpen={!!editingHabit}
        habit={editingHabit}
        onClose={() => setEditingHabit(null)}
        onUpdated={() => setRefreshKey((k) => k + 1)}
      />

      <WindowDialogUpdation
        isOpen={!!habitToDelete}
        title="Delete habit"
        message="Delete this habit and all its history?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setHabitToDelete(null)}
      />
    </div>
  );
};
