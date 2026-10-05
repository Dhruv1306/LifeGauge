import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { PieChart, Clock, RefreshCw } from "lucide-react";

interface CategorySummary {
  category: string;
  minutes: number;
  hours: number;
  percentage: number;
}

interface SummaryResponse {
  totalMinutes: number;
  totalHours: number;
  distribution: CategorySummary[];
}

export const TimeDistribution: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setIsLoading(true);
      try {
        const today = new Date();
        const end = today.toISOString().split("T")[0];
        const startD = new Date(today);
        startD.setUTCDate(today.getUTCDate() - 6);
        const start = startD.toISOString().split("T")[0];

        const res = await api.get(`/time-entries/summary?startDate=${start}&endDate=${end}`);
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load time distribution", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSummary();
  }, [refreshTrigger]);

  if (isLoading && !data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex justify-center items-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  const categoryColors = [
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-rose-500",
    "bg-purple-500",
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Time Distribution (Last 7 Days)</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg">
          <Clock className="h-3.5 w-3.5 text-emerald-400" />
          {data?.totalHours || 0} Hours Logged
        </div>
      </div>

      {!data || data.distribution.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">
          No time blocks logged in the last 7 days. Click &ldquo;+ Log Block&rdquo; above to record your focus sessions.
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Stacked bar visualization */}
          <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800 p-0.5 gap-0.5">
            {data.distribution.map((item, idx) => (
              <div
                key={item.category}
                title={`${item.category}: ${item.hours}h (${item.percentage}%)`}
                className={`h-full ${categoryColors[idx % categoryColors.length]} rounded-full transition-all`}
                style={{ width: `${item.percentage}%` }}
              />
            ))}
          </div>

          {/* Category breakdown items */}
          <div className="space-y-2 pt-2">
            {data.distribution.map((item, idx) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      categoryColors[idx % categoryColors.length]
                    }`}
                  />
                  <span className="font-medium text-slate-300">{item.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400">{item.hours} hrs</span>
                  <span className="font-mono font-semibold text-white w-9 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
