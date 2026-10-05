import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { TimeLoggerModal } from "../components/dashboard/TimeLoggerModal";
import { TimeDistribution } from "../components/charts/TimeDistribution";
import { Clock, Plus, Trash2, Calendar, Tag } from "lucide-react";

interface TimeEntryItem {
  id: string;
  category: string;
  description?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMin: number;
  task?: {
    id: string;
    title: string;
    priority: string;
  } | null;
}

export const TimePage: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      let query = "/time-entries?";
      if (categoryFilter !== "all") query += `category=${encodeURIComponent(categoryFilter)}&`;

      const res = await api.get(query);
      if (res.data.success) {
        setEntries(res.data.entries);
      }
    } catch (err) {
      console.error("Failed to load time entries", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [categoryFilter, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this time block entry?")) return;
    try {
      await api.delete(`/time-entries/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to delete time entry", err);
    }
  };

  const categories = ["all", "DSA", "Study", "Coding", "College", "Fitness", "Reading", "General"];

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="h-6 w-6 text-emerald-400" />
              Focus & Time Blocks
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Google Calendar style retrospective time blocking. Track where your hours go across subjects.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Log Time Block</span>
          </button>
        </div>

        {/* Embedded Time Distribution Chart */}
        <TimeDistribution refreshTrigger={refreshKey} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 mr-2 flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" /> Filter Category:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1 text-xs rounded-xl capitalize transition-colors ${
                  categoryFilter === c
                    ? "bg-emerald-600 text-white font-medium"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Time Blocks List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
          <h3 className="text-base font-semibold text-white mb-4">Recorded Sessions</h3>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No time blocks found. Click &ldquo;Log Time Block&rdquo; to record your focus sessions.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {entries.map((entry) => (
                <div key={entry.id} className="py-3.5 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        {entry.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {(entry.durationMin / 60).toFixed(1)} hrs ({entry.durationMin} min)
                      </span>
                      {entry.startTime && entry.endTime && (
                        <span className="text-[11px] font-mono text-slate-500">
                          {entry.startTime} &ndash; {entry.endTime}
                        </span>
                      )}
                    </div>

                    {entry.description && (
                      <p className="text-xs text-slate-300">{entry.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" />
                        {entry.date}
                      </span>
                      {entry.task && (
                        <span className="text-cyan-400">
                          Linked Task: {entry.task.title}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    title="Delete Time Block"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <TimeLoggerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLogged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};
