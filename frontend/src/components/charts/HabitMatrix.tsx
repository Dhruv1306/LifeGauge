import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import { Flame, Check, RefreshCw, X } from "lucide-react";

interface HabitMatrixData {
  startDate: string;
  endDate: string;
  dates: string[];
  habits: Array<{
    id: string;
    title: string;
    targetDays: string;
    startDate?: string | null;
    order?: number;
    days: Record<string, { scheduled: boolean; completed: boolean }>;
  }>;
  summary: {
    totalScheduled: number;
    totalCompleted: number;
    consistencyRate: number;
  };
}

interface HabitMatrixProps {
  onHabitToggled?: () => void;
  refreshTrigger?: number;
}

export const HabitMatrix: React.FC<HabitMatrixProps> = ({
  onHabitToggled,
  refreshTrigger,
}) => {
  const [data, setData] = useState<HabitMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysCount, setDaysCount] = useState<14 | 21>(14);

  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const end = today.toISOString().split("T")[0];
      const startD = new Date(today);
      startD.setUTCDate(today.getUTCDate() - (daysCount - 1));
      const start = startD.toISOString().split("T")[0];

      const res = await api.get(
        `/habits/matrix?startDate=${start}&endDate=${end}`,
      );
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load habit matrix", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [daysCount, refreshTrigger]);

  const handleToggle = async (
    habitId: string,
    date: string,
    scheduled: boolean,
  ) => {
    if (!scheduled) return; // Can still toggle, but let's toggle optimistically
    try {
      // Optimistic update
      if (data) {
        const updatedHabits = data.habits.map((h) => {
          if (h.id === habitId && h.days[date]) {
            return {
              ...h,
              days: {
                ...h.days,
                [date]: {
                  ...h.days[date],
                  completed: !h.days[date].completed,
                },
              },
            };
          }
          return h;
        });
        setData({ ...data, habits: updatedHabits });
      }

      await api.post(`/habits/${habitId}/toggle`, { date });
      if (onHabitToggled) onHabitToggled();
    } catch (err) {
      console.error("Failed to toggle habit", err);
      fetchMatrix(); // Revert on failure
    }
  };

  if (isLoading && !data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex justify-center items-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!data || data.habits.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
        <Flame className="mx-auto h-8 w-8 text-amber-500/60 mb-2" />
        <h4 className="text-sm font-semibold text-slate-200">
          No active habits defined
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Create habits like &ldquo;DSA Practice&rdquo; or &ldquo;Wake up at 6
          AM&rdquo; to unlock your punchcard grid!
        </p>
      </div>
    );
  }

  const dateColumnStyle = {
    width: `${100 / data.dates.length}%`,
    minWidth: "44px",                        // Habit punch card matrix's grid minWidth
  };

  const dateGridStyle = {
    minWidth: `${data.dates.length * 44}px`,
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              Habit Matrix
            </h3>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
              GitHub Style
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any cell to toggle your routine completion for that day.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex rounded-lg bg-slate-800/80 p-0.5 text-xs">
            <button
              onClick={() => setDaysCount(14)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                daysCount === 14
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setDaysCount(21)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                daysCount === 21
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              21 Days
            </button>
          </div>

          <div className="rounded-lg bg-slate-800/60 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-400 border border-slate-700/50">
            {data.summary.consistencyRate}% Consistency
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-[176px_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex h-[42px] items-center px-3 text-xs font-medium text-slate-400">
            Habit / Routine
          </div>
          <div className="divide-y divide-slate-800/60">
            {data.habits.map((habit) => (
              <div
                key={habit.id}
                className="flex h-[44px] items-center px-3 text-xs font-medium text-slate-200"
              >
                <div className="truncate" title={habit.title}>
                  {habit.title}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto pb-2">
          <table
            className="table-fixed min-w-max w-full border-collapse"
            style={dateGridStyle}
          >
            <thead>
              <tr>
                {data.dates.map((date) => {
                  const dayNum = date.slice(8);
                  const d = new Date(date + "T00:00:00Z");
                  const dayName = [
                    "Sun",
                    "Mon",
                    "Tue",
                    "Wed",
                    "Thu",
                    "Fri",
                    "Sat",
                  ][d.getUTCDay()];
                  const isToday =
                    date === new Date().toISOString().split("T")[0];

                  return (
                    <th
                      key={date}
                      style={dateColumnStyle}
                      className={`h-[42px] px-1 text-center ${
                        isToday
                          ? "font-bold text-emerald-400"
                          : "font-normal text-slate-400"
                      }`}
                    >
                      <div className="text-[10px] tracking-tight">
                        {dayName}
                      </div>
                      <div
                        className={`text-[11px] font-mono ${
                          isToday
                            ? "rounded-full bg-emerald-500/20 px-1 py-0.5 font-bold text-emerald-400"
                            : ""
                        }`}
                      >
                        {dayNum}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.habits.map((habit) => (
                <tr
                  key={habit.id}
                  className="h-[44px] transition-colors hover:bg-slate-800/30"
                >
                  {data.dates.map((date) => {
                    const dayState = habit.days[date] || {
                      scheduled: false,
                      completed: false,
                    };
                    const isScheduled = dayState.scheduled;
                    const isCompleted = dayState.completed;

                    return (
                      <td
                        key={date}
                        style={dateColumnStyle}
                        className="h-[44px] px-1 text-center"
                      >
                        <button
                          onClick={() =>
                            handleToggle(habit.id, date, isScheduled)
                          }
                          title={`${habit.title} on ${date}: ${
                            !isScheduled
                              ? "Unscheduled (Rest Day / Prior to Start)"
                              : isCompleted
                                ? "Completed (Click to uncheck)"
                                : "Missed / Incomplete (Click to complete)"
                          }`}
                          className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            !isScheduled
                              ? "border border-slate-800/50 bg-slate-800/30 text-slate-600 hover:border-slate-700"
                              : isCompleted
                                ? "bg-emerald-500 font-bold text-slate-950 shadow-sm shadow-emerald-500/40 hover:scale-105"
                                : "border border-rose-800/60 bg-rose-950/50 text-rose-400 hover:border-rose-700 hover:bg-rose-900/40"
                          }`}
                        >
                          {!isScheduled ? (
                            <span className="text-[10px] text-slate-600">
                              &bull;
                            </span>
                          ) : isCompleted ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : (
                            <X className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-4 pt-3 text-[11px] text-slate-400 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/30 flex items-center justify-center text-slate-950">
            <Check className="h-2.5 w-2.5 stroke-[3]" />
          </span>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-rose-950/70 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <X className="h-2.5 w-2.5 stroke-[2.5]" />
          </span>
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-slate-800/40 border border-slate-800 flex items-center justify-center text-slate-600">
            &bull;
          </span>
          <span>Rest / Unscheduled</span>
        </div>
      </div>
    </div>
  );
};
