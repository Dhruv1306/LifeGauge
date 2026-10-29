import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { ScoreGauges } from "../components/dashboard/ScoreGauges";
import { HabitMatrix } from "../components/charts/HabitMatrix";
import { StockMomentum } from "../components/charts/StockMomentum";
import { TimeDistribution } from "../components/charts/TimeDistribution";
import { TodayTaskList, TaskItem } from "../components/tasks/TodayTaskList";
import { TimeLoggerModal } from "../components/dashboard/TimeLoggerModal";
import { TaskCreateModal } from "../components/tasks/TaskCreateModal";
import { HabitCreateModal } from "../components/habits/HabitCreateModal";
import { Calendar, RefreshCw, Plus, Clock, Flame } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailyData, setDailyData] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch daily analytics (Score, tier, deltas)
      const analyticsRes = await api.get(`/analytics/daily?date=${selectedDate}`);
      if (analyticsRes.data.success) {
        setDailyData(analyticsRes.data);
      }

      // 2. Fetch tasks for selected date
      const tasksRes = await api.get(`/tasks?dueDate=${selectedDate}`);
      if (tasksRes.data.success) {
        setTasks(tasksRes.data.tasks);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshKey]);

  const triggerGlobalRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Cockpit Date Bar & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-1.5 border border-slate-700/60">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-medium text-white focus:outline-none cursor-pointer"
              />
            </div>

            {isToday ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                Today&apos;s Focus
              </span>
            ) : (
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="text-xs text-slate-400 hover:text-emerald-400 underline"
              >
                Jump to Today
              </button>
            )}

            <button
              onClick={triggerGlobalRefresh}
              title="Refresh Cockpit"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsTimeModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30 transition-colors shadow-sm"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Log Time Block</span>
            </button>

            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600/20 border border-cyan-500/30 px-3.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-600/30 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </button>

            <button
              onClick={() => setIsHabitModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600/20 border border-amber-500/30 px-3.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-600/30 transition-colors shadow-sm"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>New Habit</span>
            </button>
          </div>
        </div>

        {/* 1. Score Gauges & Modular Performance */}
        <ScoreGauges
          metrics={dailyData?.metrics || null}
          delta={dailyData?.delta || null}
          onOpenTimeLogger={() => setIsTimeModalOpen(true)}
        />

        {/* 2. Primary Custom Visualizations */}
        <div className="space-y-6">
          {/* Visual 1: Habit Punchcard Matrix (LeetCode / GitHub style) */}
          <HabitMatrix onHabitToggled={triggerGlobalRefresh} />

          {/* Visual 2: Stock-Style Momentum Trajectory Area Chart */}
          <StockMomentum refreshTrigger={refreshKey} />
        </div>

        {/* 3. Lower Row: Time Distribution & Today's Task Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayTaskList
            tasks={tasks}
            onTaskUpdated={triggerGlobalRefresh}
            onOpenCreate={() => setIsTaskModalOpen(true)}
          />

          <TimeDistribution refreshTrigger={refreshKey} />
        </div>
      </main>

      {/* Modals */}
      <TimeLoggerModal
        isOpen={isTimeModalOpen}
        onClose={() => setIsTimeModalOpen(false)}
        onLogged={triggerGlobalRefresh}
        initialDate={selectedDate}
      />

      <TaskCreateModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onCreated={triggerGlobalRefresh}
        defaultDate={selectedDate}
      />

      <HabitCreateModal
        isOpen={isHabitModalOpen}
        onClose={() => setIsHabitModalOpen(false)}
        onCreated={triggerGlobalRefresh}
      />
    </div>
  );
};
