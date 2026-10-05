import React from "react";
import { CheckSquare, Flame, Clock, Gauge, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DailyMetricsData {
  status: "ACTIVE" | "REST_DAY";
  isRestDay: boolean;
  moduleScores: {
    taskCompletionRate: number;
    highPriorityRate: number;
    focusScore: number;
    habitConsistency: number;
  };
  unifiedScore: number | null;
  tierLabel: string;
  focusMinutes: number;
  focusTargetMinutes: number;
  tasksCompleted: number;
  tasksTotal: number;
  highPriorityCompleted: number;
  highPriorityTotal: number;
  habitsCompleted: number;
  habitsScheduled: number;
  weightsApplied: {
    tasks: number;
    focus: number;
    habits: number;
  };
}

interface DeltaData {
  scoreDelta: number | null;
  direction: "UP" | "DOWN" | "STABLE" | "NO_DATA";
  taskRateDelta: number;
  focusMinutesDelta: number;
  habitRateDelta: number;
}

interface ScoreGaugesProps {
  metrics: DailyMetricsData | null;
  delta: DeltaData | null;
  onOpenTimeLogger: () => void;
}

export const ScoreGauges: React.FC<ScoreGaugesProps> = ({ metrics, delta, onOpenTimeLogger }) => {
  if (!metrics) return null;

  const { isRestDay, unifiedScore, tierLabel, moduleScores } = metrics;

  const getTierColor = (label: string) => {
    switch (label) {
      case "Highly productive":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "Doing great":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "Needs more focus":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* 1. Main Unified Daily Score Cockpit Card */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-xl md:col-span-1 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-emerald-400" />
            Daily Gauge
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${getTierColor(
              tierLabel
            )}`}
          >
            {tierLabel}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          {isRestDay ? (
            <div className="text-3xl font-extrabold text-slate-300">Rest Day</div>
          ) : (
            <>
              <span className="text-4xl font-extrabold font-mono text-white tracking-tight">
                {unifiedScore?.toFixed(1)}
              </span>
              <span className="text-sm font-medium text-slate-400">/ 10.0</span>
            </>
          )}
        </div>

        {/* Day-over-day delta indicator */}
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {delta?.direction === "UP" ? (
            <span className="flex items-center text-emerald-400 font-mono font-medium">
              <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> +{delta.scoreDelta} vs Yesterday
            </span>
          ) : delta?.direction === "DOWN" ? (
            <span className="flex items-center text-rose-400 font-mono font-medium">
              <TrendingDown className="h-3.5 w-3.5 mr-0.5" /> {delta.scoreDelta} vs Yesterday
            </span>
          ) : delta?.direction === "STABLE" ? (
            <span className="flex items-center text-slate-400 font-mono">
              <Minus className="h-3.5 w-3.5 mr-0.5" /> Stable vs Yesterday
            </span>
          ) : (
            <span className="text-slate-400">Personal activity indicator</span>
          )}
        </div>
      </div>

      {/* 2. Tasks Metric Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-cyan-400" />
              Task Completion
            </span>
            <span className="text-xs font-mono text-slate-400">
              {metrics.tasksCompleted} / {metrics.tasksTotal}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {moduleScores.taskCompletionRate}%
            </span>
            {metrics.highPriorityTotal > 0 && (
              <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-mono text-amber-400">
                High: {moduleScores.highPriorityRate}% ({metrics.highPriorityCompleted}/{metrics.highPriorityTotal})
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-cyan-500 rounded-full transition-all duration-500"
            style={{ width: `${moduleScores.taskCompletionRate}%` }}
          />
        </div>
      </div>

      {/* 3. Focus / Time Metric Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-400" />
              Focus Time
            </span>
            <button
              onClick={onOpenTimeLogger}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline"
            >
              + Log Block
            </button>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {(metrics.focusMinutes / 60).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Target: {(metrics.focusTargetMinutes / 60).toFixed(1)}h
            </span>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (metrics.focusMinutes / metrics.focusTargetMinutes) * 100)}%` }}
          />
        </div>
      </div>

      {/* 4. Habit Consistency Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" />
              Habit Consistency
            </span>
            <span className="text-xs font-mono text-slate-400">
              {metrics.habitsCompleted} / {metrics.habitsScheduled} Done
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-white">
              {metrics.habitsScheduled > 0 ? `${moduleScores.habitConsistency}%` : "No Habits Today"}
            </span>
            {metrics.habitsScheduled === 0 && (
              <span className="text-[11px] text-slate-400 italic">Rest Day</span>
            )}
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${moduleScores.habitConsistency}%` }}
          />
        </div>
      </div>
    </div>
  );
};
