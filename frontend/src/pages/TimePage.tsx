import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { TimeLoggerModal } from "../components/dashboard/TimeLoggerModal";
import { TimeDistribution } from "../components/charts/TimeDistribution";
import { WindowDialogUpdation } from "../components/common/WindowDialogUpdation";
import { TOAST_EVENT } from "../components/common/ActionToast";
import {
  Clock,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Tag,
  Pin,
  Medal,
} from "lucide-react";

interface TimeEntryItem {
  id: string;
  name?: string;
  category: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMin: number;
  isPinned: boolean;
  rank?: number | null;
  task?: {
    id: string;
    title: string;
    priority: string;
  } | null;
}

export const TimePage: React.FC = () => {
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<string | null>(null);

  // Focus Logs state
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["General"]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimeEntryItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  // Fetch productivity time entries
  const fetchEntries = async () => {
    setIsLoadingEntries(true);
    try {
      let query = "/time-entries?";
      if (categoryFilter !== "all")
        query += `category=${encodeURIComponent(categoryFilter)}&`;

      const res = await api.get(query);
      if (res.data.success) {
        setEntries(res.data.entries);
      }
      if (categoryFilter !== "all") {
        const allEntriesRes = await api.get("/time-entries");
        if (allEntriesRes.data.success) {
          setCategoryOptions(
            Array.from(
              new Set([
                "General",
                ...allEntriesRes.data.entries.map(
                  (entry: TimeEntryItem) => entry.category,
                ),
              ]),
            ),
          );
        }
      } else {
        setCategoryOptions(
          Array.from(
            new Set([
              "General",
              ...res.data.entries.map(
                (entry: TimeEntryItem) => entry.category,
              ),
            ]),
          ),
        );
      }
    } catch (err) {
      console.error("Failed to load time entries", err);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [categoryFilter, refreshKey]);

  const handleDeleteTimeEntry = async (id: string) => {
    setTimeEntryToDelete(id);
  };

  const confirmDeleteTimeEntry = async () => {
    if (!timeEntryToDelete) return;
    try {
      await api.delete(`/time-entries/${timeEntryToDelete}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to delete time entry", err);
    } finally {
      setTimeEntryToDelete(null);
    }
  };

  const handleEditTimeEntry = (entry: TimeEntryItem) => {
    setEntryToEdit(entry);
    setIsLoggerOpen(true);
  };

  const handleTogglePin = async (entry: TimeEntryItem) => {
    try {
      const response = await api.patch(`/time-entries/${entry.id}/pin`);
      const isPinned = response.data.entry?.isPinned ?? !entry.isPinned;
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: {
            type: "success",
            message: `"${entry.name || "Focus Session"}" ${
              isPinned ? "pinned." : "unpinned."
            }`,
          },
        }),
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to update focus session pin", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-6xl px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="h-6 w-6 text-emerald-400 shrink-0" />
              <span>Time Blocks & Focus Sessions</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              LifeGauge productivity focus time tracking & block distribution.
            </p>
          </div>

          <button
            onClick={() => setIsLoggerOpen(true)}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Log Focus Session</span>
          </button>
        </div>

        {/* Productivity Focus Logs Content */}
        <div className="space-y-4 sm:space-y-6">
          {/* Embedded Time Distribution Chart */}
          <TimeDistribution refreshTrigger={refreshKey} />

          {/* Category Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
              <Tag className="h-3.5 w-3.5" /> Filter Category:
            </span>
            <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              {["all", ...categoryOptions].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 sm:py-1 text-xs rounded-xl capitalize transition-colors shrink-0 whitespace-nowrap ${
                    categoryFilter === c
                      ? "bg-emerald-600 text-white font-medium"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </div>

          {/* Recorded Focus Sessions List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">
                Recorded Focus Sessions
              </h3>
              <span className="text-[11px] sm:text-xs text-slate-500 font-mono">
                Feeds LifeGauge Analytics
              </span>
            </div>

            {isLoadingEntries ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading focus entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No focus blocks found. Click &ldquo;Log Focus Session&rdquo; above to record your deep work.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white break-words">
                          {entry.name || "Focus Session"}
                        </span>
                        <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400 shrink-0">
                          {entry.category}
                        </span>
                        {entry.rank && entry.rank <= 3 && (
                          <Medal
                            className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${
                              entry.rank === 1
                                ? "text-amber-400"
                                : entry.rank === 2
                                  ? "text-slate-300"
                                  : "text-orange-500"
                            }`}
                            aria-label={`${entry.rank}${entry.rank === 1 ? "st" : entry.rank === 2 ? "nd" : "rd"} place`}
                          />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" />
                          {entry.date}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {(entry.durationMin / 60).toFixed(1)} hrs ({entry.durationMin} min)
                        </span>
                        {entry.task && (
                          <span className="text-cyan-400 truncate max-w-[200px] sm:max-w-xs">
                            Linked Task: {entry.task.title}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleTogglePin(entry)}
                        title={entry.isPinned ? "Unpin Focus Block" : "Pin Focus Block"}
                        className={`p-2 sm:p-1.5 rounded-lg transition-colors ${
                          entry.isPinned
                            ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                            : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/30"
                        }`}
                      >
                        <Pin className={`h-4 w-4 ${entry.isPinned ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => handleEditTimeEntry(entry)}
                        title="Edit Focus Block"
                        className="focus-edit-icon p-2 sm:p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-950/30 rounded-lg transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTimeEntry(entry.id)}
                        title="Delete Focus Block"
                        className="focus-delete-icon p-2 sm:p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Productivity Logger Modal */}
      <TimeLoggerModal
        isOpen={isLoggerOpen}
        initialEntry={entryToEdit}
        categories={categoryOptions}
        onClose={() => {
          setIsLoggerOpen(false);
          setEntryToEdit(null);
        }}
        onLogged={() => {
          setRefreshKey((k) => k + 1);
          setEntryToEdit(null);
        }}
      />

      <WindowDialogUpdation
        isOpen={!!timeEntryToDelete}
        title="Delete focus time block"
        message="Delete this focus time block?"
        confirmLabel="Delete"
        onConfirm={confirmDeleteTimeEntry}
        onCancel={() => setTimeEntryToDelete(null)}
      />
    </div>
  );
};
