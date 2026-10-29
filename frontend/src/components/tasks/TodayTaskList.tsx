import React, { useState } from "react";
import { api } from "../../api/client";
import { CheckSquare, Square, Plus, Check, Pencil } from "lucide-react";
import { TaskEditModal } from "./TaskEditModal";

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  isCompleted: boolean;
}

interface TodayTaskListProps {
  tasks: TaskItem[];
  onTaskUpdated: () => void;
  onOpenCreate: () => void;
}

export const TodayTaskList: React.FC<TodayTaskListProps> = ({
  tasks,
  onTaskUpdated,
  onOpenCreate,
}) => {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const handleToggle = async (task: TaskItem) => {
    setTogglingId(task.id);
    try {
      await api.patch(`/tasks/${task.id}`, {
        isCompleted: !task.isCompleted,
      });
      onTaskUpdated();
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setTogglingId(null);
    }
  };

  const priorityStyles = {
    HIGH: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    LOW: "bg-slate-800 text-slate-400 border-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Today&apos;s Priority Tasks</h3>
        </div>
        <button
          onClick={onOpenCreate}
          className="flex items-center gap-1 rounded-xl bg-cyan-600/20 border border-cyan-500/30 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-600/30 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No tasks scheduled for today. Click &ldquo;New Task&rdquo; to add something to your list!
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleToggle(task)}
              className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                task.isCompleted
                  ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                  : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={togglingId === task.id}
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-lg border transition-colors ${
                    task.isCompleted
                      ? "bg-emerald-500 border-emerald-500 text-slate-950"
                      : "border-slate-600 hover:border-emerald-400"
                  }`}
                >
                  {task.isCompleted ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : (
                    <Square className="h-3.5 w-3.5 opacity-0" />
                  )}
                </button>
                <div>
                  <h4
                    className={`text-xs font-medium ${
                      task.isCompleted ? "line-through text-slate-400" : "text-slate-200"
                    }`}
                  >
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${
                    priorityStyles[task.priority]
                  }`}
                >
                  {task.priority}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTask(task);
                  }}
                  title="Edit Task"
                  className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskEditModal
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdated={onTaskUpdated}
      />
    </div>
  );
};
