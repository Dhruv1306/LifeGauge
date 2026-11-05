import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface TimeSeriesPoint {
  date: string;
  dayLabel: string;
  score: number | null;
  displayScore: number;
  status: string;
  isRestDay: boolean;
  focusMinutes: number;
  focusHours: number;
  taskCompletionRate: number;
  habitConsistency: number;
}

interface MomentumData {
  daysCount: number;
  averageScore: number;
  activeDaysCount: number;
  restDaysCount: number;
  timeSeries: TimeSeriesPoint[];
}

interface StockMomentumProps {
  refreshTrigger?: number;
}

export const StockMomentum: React.FC<StockMomentumProps> = ({ refreshTrigger }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const gridColor = isLight ? "#E5DFB8" : "#1e293b";
  const tickColor = isLight ? "#606C38" : "#64748b";
  const axisColor = isLight ? "#D8D1A3" : "#334155";
  const steadyColor = isLight ? "#BC6C25" : "#334155";
  const steadyTextColor = isLight ? "#BC6C25" : "#64748b";
  const highColor = isLight ? "#283618" : "#10b981";
  const chartStroke = isLight ? "#606C38" : "#10b981";

  const [data, setData] = useState<MomentumData | null>(null);
  const [daysParam, setDaysParam] = useState<7 | 14 | 30>(14);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMomentum = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/analytics/momentum?days=${daysParam}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load momentum data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMomentum();
  }, [daysParam, refreshTrigger]);

  if (isLoading && !data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex justify-center items-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  const timeSeries = data?.timeSeries || [];
  const latestPoint = timeSeries[timeSeries.length - 1];
  const previousPoint = timeSeries[timeSeries.length - 2];

  const momentumDelta =
    latestPoint && previousPoint && latestPoint.score !== null && previousPoint.score !== null
      ? parseFloat((latestPoint.score - previousPoint.score).toFixed(1))
      : 0;

  const isRising = momentumDelta > 0;
  const isFalling = momentumDelta < 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            {isRising ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : isFalling ? (
              <TrendingDown className="h-5 w-5 text-rose-400" />
            ) : (
              <Minus className="h-5 w-5 text-slate-400" />
            )}
            <h3 className="text-base font-semibold text-white">Stock-Style Momentum Trajectory</h3>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-mono font-medium flex items-center gap-1 ${
                isRising
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : isFalling
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {isRising ? `+${momentumDelta} vs Yesterday` : isFalling ? `${momentumDelta} vs Yesterday` : "Stable"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Day-over-day productivity momentum with baseline progress indicators.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Days Filter */}
          <div className="flex rounded-lg bg-slate-800/80 p-0.5 text-xs">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDaysParam(d as 7 | 14 | 30)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  daysParam === d
                    ? "bg-emerald-600 text-white font-medium"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <button
            onClick={fetchMomentum}
            title="Refresh Momentum Data"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartStroke} stopOpacity={0.4} />
                <stop offset="95%" stopColor={chartStroke} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />

            <XAxis
              dataKey="dayLabel"
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={{ stroke: axisColor }}
              tickLine={false}
            />

            <YAxis
              domain={[0, 10]}
              ticks={[0, 2.5, 5.0, 7.5, 10.0]}
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={{ stroke: axisColor }}
              tickLine={false}
            />

            {/* Horizontal Reference Lines (Stock chart thresholds) */}
            <ReferenceLine
              y={7.5}
              stroke={highColor}
              strokeDasharray="4 4"
              label={{
                value: "High (7.5)",
                fill: highColor,
                fontSize: 10,
                position: "insideTopRight",
              }}
            />
            <ReferenceLine
              y={5.0}
              stroke={steadyColor}
              strokeDasharray="4 4"
              label={{
                value: "Steady (5.0)",
                fill: steadyTextColor,
                fontSize: 10,
                position: "insideTopRight",
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as TimeSeriesPoint;
                  return (
                    <div className="rounded-xl border border-olive-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md text-xs">
                      <div className="font-semibold text-olive-900 dark:text-slate-200 border-b border-olive-200 dark:border-slate-800 pb-1 mb-1.5 flex justify-between gap-4">
                        <span>{pt.date}</span>
                        <span
                          className={`font-mono font-bold ${
                            pt.isRestDay
                              ? "text-olive-600 dark:text-slate-400"
                              : (pt.score ?? 0) >= 7.5
                              ? "text-olive-800 dark:text-emerald-400 font-bold"
                              : (pt.score ?? 0) >= 5.0
                              ? "text-olive-600 dark:text-cyan-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {pt.isRestDay ? "Rest Day" : `${pt.score?.toFixed(1)} / 10.0`}
                        </span>
                      </div>
                      <div className="space-y-1 text-olive-700 dark:text-slate-400">
                        <div className="flex justify-between gap-3">
                          <span>Focus Time:</span>
                          <span className="font-mono text-olive-900 dark:text-slate-200">{pt.focusHours}h</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Task Completion:</span>
                          <span className="font-mono text-olive-900 dark:text-slate-200">{pt.taskCompletionRate}%</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span>Habit Consistency:</span>
                          <span className="font-mono text-olive-900 dark:text-slate-200">{pt.habitConsistency}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="displayScore"
              stroke={chartStroke}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
