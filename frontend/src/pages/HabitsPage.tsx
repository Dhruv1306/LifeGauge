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
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface HabitItem {
  id: string;
  title: string;
  targetDays: string;
  startDate?: string | null;
  order?: number;
  isActive: boolean;
  createdAt: string;
}

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  const moveHabit = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;
    const updated = [...habits];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    handleReorder(updated);
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

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Flame className="h-6 w-6 text-amber-400" />
              Habits & Consistency Matrix
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Build daily momentum and review your routines on the LeetCode /
              GitHub style punchcard grid.
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

        {/* Active Habits List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">
              Configured Habits
            </h3>
            <span className="text-[11px] text-slate-400">
              Drag handles or use arrows to reorder
            </span>
          </div>

          {habits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No habits configured yet. Click &ldquo;New Habit&rdquo; to start
              tracking.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {habits.map((habit, index) => (
                <div
                  key={habit.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`py-3 flex items-center justify-between gap-3 transition-colors ${
                    draggedIndex === index
                      ? "opacity-40 bg-slate-800/40 rounded-xl px-2"
                      : "hover:bg-slate-800/20 px-2 rounded-xl"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Drag Handle & Up/Down Arrows */}
                    <div className="flex items-center gap-0.5 text-slate-500">
                      <div
                        className="cursor-grab active:cursor-grabbing p-1 hover:text-slate-300"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveHabit(index, "up")}
                          title="Move Up"
                          className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === habits.length - 1}
                          onClick={() => moveHabit(index, "down")}
                          title="Move Down"
                          className="p-0.5 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="truncate">
                      <h4 className="text-sm font-medium text-white truncate">
                        {habit.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-400" />
                          {habit.targetDays === "ALL"
                            ? "Everyday (7 Days)"
                            : habit.targetDays}
                        </span>
                        {habit.startDate && (
                          <span className="text-slate-500">
                            Started: {habit.startDate.split("T")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingHabit(habit)}
                      title="Edit Habit"
                      className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(habit.id)}
                      title="Delete Habit"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
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

