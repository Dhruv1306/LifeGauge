import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import {
  Flame,
  Check,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface HabitMatrixData {
  startDate: string;
  endDate: string;
  dates: string[];
  registrationDate?: string;
  isPreRegistration?: boolean;
  message?: string;
  habits: Array<{
    id: string;
    title: string;
    targetDays: string;
    startDate?: string | null;
    order?: number;
    days: Record<
      string,
      {
        scheduled: boolean;
        completed: boolean;
        isFuture?: boolean;
        outsideTracking?: boolean;
      }
    >;
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

type ViewMode = "14" | "21" | "monthly";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const HabitMatrix: React.FC<HabitMatrixProps> = ({
  onHabitToggled,
  refreshTrigger,
}) => {
  const [data, setData] = useState<HabitMatrixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("14");

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const fetchMatrix = async () => {
    setIsLoading(true);
    try {
      let url = "";
      if (viewMode === "monthly") {
        url = `/habits/matrix?year=${selectedYear}&month=${selectedMonth}`;
      } else {
        const days = viewMode === "21" ? 21 : 14;
        const end = today.toISOString().split("T")[0];
        const startD = new Date(today);
        startD.setUTCDate(today.getUTCDate() - (days - 1));
        const start = startD.toISOString().split("T")[0];
        url = `/habits/matrix?startDate=${start}&endDate=${end}`;
      }

      const res = await api.get(url);
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
  }, [viewMode, selectedYear, selectedMonth, refreshTrigger]);

  const handleToggle = async (
    habitId: string,
    date: string,
    dayState?: {
      scheduled: boolean;
      completed: boolean;
      isFuture?: boolean;
      outsideTracking?: boolean;
    }
  ) => {
    // Disallow logging for future dates or pre-registration dates
    if (
      !dayState ||
      dayState.isFuture ||
      dayState.outsideTracking ||
      !dayState.scheduled
    ) {
      return;
    }

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

  // Month navigation helpers
  const regDate = data?.registrationDate;
  const regYear = regDate ? parseInt(regDate.split("-")[0], 10) : currentYear;
  const regMonth = regDate ? parseInt(regDate.split("-")[1], 10) : 1;

  const isPrevDisabled =
    selectedYear < regYear ||
    (selectedYear === regYear && selectedMonth <= regMonth);

  const isNextDisabled =
    selectedYear > currentYear ||
    (selectedYear === currentYear && selectedMonth >= currentMonth);

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleJumpToCurrentMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const handleJumpToRegMonth = () => {
    if (regYear && regMonth) {
      setSelectedYear(regYear);
      setSelectedMonth(regMonth);
    }
  };

  const isCurrentMonthSelected =
    selectedYear === currentYear && selectedMonth === currentMonth;

  // Generate Year dropdown options
  const startYear = Math.min(regYear, currentYear - 3);
  const yearsList: number[] = [];
  for (let y = currentYear; y >= startYear; y--) {
    yearsList.push(y);
  }

  if (isLoading && !data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex justify-center items-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Calculate dynamic column sizing
  const datesCount = data?.dates?.length || 14;
  const columnWidthPx = viewMode === "monthly" ? 36 : 42;
  const dateColumnStyle = {
    width: `${columnWidthPx}px`,
    minWidth: `${columnWidthPx}px`,
    maxWidth: `${columnWidthPx}px`,
  };

  const dateGridStyle = {
    minWidth: `${datesCount * columnWidthPx}px`,
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              Habit Matrix
            </h3>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
              GitHub
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            The mirror of Your Dedication.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* 3 View Mode Toggle Buttons */}
          <div className="flex rounded-lg bg-slate-800/80 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("14")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "14"
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setViewMode("21")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "21"
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              21 Days
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "monthly"
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
          </div>

          {data && !data.isPreRegistration && (
            <div className="rounded-lg bg-slate-800/60 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-400 border border-slate-700/50">
              {data.summary.consistencyRate}% Consistency
            </div>
          )}
        </div>
      </div>

      {/* Monthly Selector Controls (visible only in Monthly View) */}
      {viewMode === "monthly" && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextDisabled}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </span>

            {!isCurrentMonthSelected && (
              <button
                type="button"
                onClick={handleJumpToCurrentMonth}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 font-medium transition-colors"
              >
                Current Month
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pre-Registration Notification Banner */}
      {data?.isPreRegistration ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center my-4">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-400 mb-2" />
          <h4 className="text-sm font-semibold text-amber-200">
            Pre-Registration Period
          </h4>
          <p className="text-xs text-amber-300/90 mt-1.5 max-w-lg mx-auto leading-relaxed">
            {data.message}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleJumpToRegMonth}
              className="rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 transition-colors"
            >
              Go to First Available Month
            </button>
            <button
              type="button"
              onClick={handleJumpToCurrentMonth}
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              View Current Month
            </button>
          </div>
        </div>
      ) : !data || data.habits.length === 0 ? (
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
      ) : (
        /* Grid Container */
        <div className="grid grid-cols-[176px_minmax(0,1fr)]">
          {/* Habits Title Column */}
          <div className="min-w-0">
            <div className="flex h-[42px] items-center px-3 text-xs font-medium text-slate-400 border-b border-slate-800/60">
              Habits / Routine
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

          {/* Horizontally Scrollable Dates Grid */}
          <div className="min-w-0 overflow-x-auto pb-2">
            <table
              className="table-fixed min-w-max w-full border-collapse"
              style={dateGridStyle}
            >
              <thead>
                <tr className="border-b border-slate-800/60">
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
                    const todayStr = new Date().toISOString().split("T")[0];
                    const isToday = date === todayStr;
                    const isFuture = date > todayStr;
                    const isOutside = data.registrationDate
                      ? date < data.registrationDate
                      : false;

                    return (
                      <th
                        key={date}
                        style={dateColumnStyle}
                        className={`h-[42px] px-0.5 text-center select-none ${
                          isToday
                            ? "font-bold text-emerald-400"
                            : isOutside
                              ? "font-normal text-slate-600 opacity-60"
                              : isFuture
                                ? "font-normal text-slate-500"
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
                    className="habit-matrix-row h-[44px] transition-colors hover:bg-slate-800/30"
                  >
                    {data.dates.map((date) => {
                      const dayState = habit.days[date] || {
                        scheduled: false,
                        completed: false,
                      };
                      const isScheduled = dayState.scheduled;
                      const isCompleted = dayState.completed;
                      const isFuture = !!dayState.isFuture;
                      const isOutside = !!dayState.outsideTracking;

                      return (
                        <td
                          key={date}
                          style={dateColumnStyle}
                          className="h-[44px] px-0.5 text-center"
                        >
                          {isOutside ? (
                            /* Outside tracking period (Pre-registration partial month) */
                            <div
                              title={`Outside tracking period (Account registered on ${data.registrationDate || ""})`}
                              className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-slate-700/60 dark:border-slate-800/60 bg-slate-800/20 dark:bg-slate-900/30 text-slate-500 cursor-not-allowed select-none"
                            >
                              <span className="text-[11px]">&ndash;</span>
                            </div>
                          ) : isFuture ? (
                            /* Future Date: Unscheduled, non-interactive */
                            <div
                              title={`${habit.title} on ${date}: Unscheduled (Future Date)`}
                              className="habit-matrix-rest mx-auto flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800/40 bg-slate-800/10 text-slate-500 cursor-default select-none"
                            >
                              <span className="text-[10px]">&bull;</span>
                            </div>
                          ) : (
                            /* Active Historical / Today Date */
                            <button
                              type="button"
                              onClick={() =>
                                handleToggle(habit.id, date, dayState)
                              }
                              title={`${habit.title} on ${date}: ${
                                !isScheduled
                                  ? "Unscheduled (Rest Day / Prior to Start)"
                                  : isCompleted
                                    ? "Completed (Click to uncheck)"
                                    : "Missed / Incomplete (Click to complete)"
                              }`}
                              className={`habit-matrix-cell mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                                !isScheduled
                                  ? "habit-matrix-rest border border-slate-800/50 bg-slate-800/30 text-slate-600 hover:border-slate-700"
                                  : isCompleted
                                    ? "matrix-completed bg-emerald-500 font-bold text-slate-950 shadow-sm shadow-emerald-500/40 hover:scale-105"
                                    : "matrix-missed border border-rose-800/60 bg-rose-950/50 text-rose-400 hover:border-rose-700 hover:bg-rose-900/40"
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
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-4 pt-3 text-[11px] text-slate-400 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="habit-matrix-cell matrix-completed h-3.5 w-3.5 rounded-md bg-emerald-500 shadow-sm shadow-emerald-500/30 flex items-center justify-center text-slate-950">
            <Check className="h-2.5 w-2.5 stroke-[3]" />
          </span>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="habit-matrix-cell matrix-missed h-3.5 w-3.5 rounded-md bg-rose-950/70 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <X className="h-2.5 w-2.5 stroke-[2.5]" />
          </span>
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="habit-matrix-rest h-3.5 w-3.5 flex items-center justify-center text-slate-600">
            &bull;
          </span>
          <span>Rest / Unscheduled</span>
        </div>
        {viewMode === "monthly" && (
          <div className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-md border border-dashed border-slate-700 bg-slate-800/30 flex items-center justify-center text-slate-500 font-mono text-[10px]">
              &ndash;
            </span>
            <span>Outside Tracking Period</span>
          </div>
        )}
      </div>
    </div>
  );
};
