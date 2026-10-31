import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { TaskCreateModal } from "../components/tasks/TaskCreateModal";
import { TaskEditModal } from "../components/tasks/TaskEditModal";
import { TaskItem } from "../components/tasks/TodayTaskList";
import { WindowDialogUpdation } from "../components/common/WindowDialogUpdation";
import {
  CheckSquare,
  Plus,
  Trash2,
  Check,
  Search,
  Filter,
  Pencil,
} from "lucide-react";

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      let query = "/tasks?";
      if (statusFilter !== "all") query += `status=${statusFilter}&`;
      if (priorityFilter !== "all") query += `priority=${priorityFilter}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;

      const res = await api.get(query);
      if (res.data.success) {
        setTasks(res.data.tasks);
      }
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, search]);

  const handleToggle = async (task: TaskItem) => {
    try {
      await api.patch(`/tasks/${task.id}`, { isCompleted: !task.isCompleted });
      fetchTasks();
    } catch (err) {
      console.error("Failed to toggle task", err);
    }
  };

  const handleDelete = async (id: string) => {
    setTaskToDelete(id);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      fetchTasks();
    } catch (err) {
      console.error("Failed to delete task", err);
    } finally {
      setTaskToDelete(null);
    }
  };

  const priorityStyles = {
    HIGH: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    LOW: "bg-slate-800 text-slate-400 border-slate-700",
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-cyan-400" />
              Tasks & Priorities
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize scheduled work, set priority weightings, and track
              execution.
            </p>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-8 pr-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <div className="flex rounded-xl bg-slate-800 p-0.5 text-xs">
              {(["all", "active", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-cyan-600 text-white font-medium"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 py-16 text-center text-xs text-slate-400">
            No tasks found matching your filter criteria.
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${
                  task.isCompleted
                    ? "bg-slate-900/30 border-slate-800/50 opacity-60"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-lg border transition-colors ${
                      task.isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-slate-950 font-bold"
                        : "border-slate-600 hover:border-cyan-400"
                    }`}
                  >
                    {task.isCompleted && (
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    )}
                  </button>

                  <div>
                    <h3
                      className={`text-sm font-medium ${
                        task.isCompleted
                          ? "line-through text-slate-400"
                          : "text-white"
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1">
                        {task.description}
                      </p>
                    )}
                    {task.dueDate && (
                      <span className="inline-block text-[11px] font-mono text-slate-400 mt-1.5">
                        Due: {task.dueDate.split("T")[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold mr-1.5 ${
                      priorityStyles[task.priority]
                    }`}
                  >
                    {task.priority}
                  </span>

                  <button
                    onClick={() => setEditingTask(task)}
                    title="Edit Task"
                    className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(task.id)}
                    title="Delete Task"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <TaskCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchTasks}
      />

      <TaskEditModal
        isOpen={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdated={fetchTasks}
      />

      <WindowDialogUpdation
        isOpen={!!taskToDelete}
        title="Delete task"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
