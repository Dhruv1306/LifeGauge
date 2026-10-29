import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Navbar } from "../components/common/Navbar";
import { TimeLoggerModal } from "../components/dashboard/TimeLoggerModal";
import { TimeDistribution } from "../components/charts/TimeDistribution";
import { GoogleCalendarView } from "../components/calendar/GoogleCalendarView";
import { GoogleCalendarConnect } from "../components/calendar/GoogleCalendarConnect";
import { WindowDialogUpdation } from "../components/common/WindowDialogUpdation";
import {
  Clock,
  Plus,
  Trash2,
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab =
    (searchParams.get("tab") as "calendar" | "focus") || "calendar";
  const [activeTab, setActiveTab] = useState<"calendar" | "focus">(initialTab);

  // Google Calendar Connection Status
  const [isCalendarConnected, setIsCalendarConnected] = useState<
    boolean | null
  >(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Notification banners (OAuth redirect callbacks)
  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [timeEntryToDelete, setTimeEntryToDelete] = useState<string | null>(
    null,
  );
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  // Focus Logs state
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  // Check Google Calendar connection status
  const checkCalendarStatus = async () => {
    try {
      const res = await api.get("/calendar/google/status");
      if (res.data.success) {
        setIsCalendarConnected(res.data.connected);
        setGoogleEmail(res.data.googleEmail || null);
        setLastSyncedAt(res.data.lastSyncedAt || null);
      }
    } catch {
      setIsCalendarConnected(false);
    }
  };

  useEffect(() => {
    checkCalendarStatus();

    // Check for OAuth redirect messages in query string
    const oauthStatus = searchParams.get("oauth");
    if (oauthStatus === "success") {
      setToastMsg({
        type: "success",
        text: "Successfully connected to Google Calendar! Two-way synchronization active.",
      });
      setActiveTab("calendar");
      checkCalendarStatus();
      // Clean query params
      setSearchParams({ tab: "calendar" });
    } else if (oauthStatus === "denied") {
      setToastMsg({
        type: "error",
        text: "Google authorization was cancelled.",
      });
      setSearchParams({ tab: "calendar" });
    } else if (oauthStatus === "error") {
      const reason = searchParams.get("reason") || "Authorization failed.";
      setToastMsg({
        type: "error",
        text: `Google connection failed: ${decodeURIComponent(reason)}`,
      });
      setSearchParams({ tab: "calendar" });
    }
  }, []);

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
    } catch (err) {
      console.error("Failed to load time entries", err);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (activeTab === "focus") {
      fetchEntries();
    }
  }, [categoryFilter, refreshKey, activeTab]);

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

  const handleDisconnectCalendar = async () => {
    setIsDisconnectConfirmOpen(true);
  };

  const confirmDisconnectCalendar = async () => {
    try {
      await api.post("/calendar/google/disconnect");
      setIsCalendarConnected(false);
      setGoogleEmail(null);
      setLastSyncedAt(null);
    } catch (err) {
      console.error("Failed to disconnect calendar", err);
    } finally {
      setIsDisconnectConfirmOpen(false);
    }
  };

  const handleTabChange = (tab: "calendar" | "focus") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const categories = [
    "all",
    "DSA",
    "Study",
    "Coding",
    "College",
    "Fitness",
    "Reading",
    "General",
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="h-6 w-6 text-emerald-400" />
              <span>Time Blocks & Calendar</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Google Calendar schedule management & LifeGauge focus time
              tracking.
            </p>
          </div>

          {/* Quick Action Button depending on active tab */}
          {activeTab === "focus" && (
            <button
              onClick={() => setIsLoggerOpen(true)}
              className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4" />
              <span>Log Focus Session</span>
            </button>
          )}
        </div>

        {/* OAuth / Status Notification Toast */}
        {toastMsg && (
          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs ${
              toastMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{toastMsg.text}</span>
            </div>
            <button
              onClick={() => setToastMsg(null)}
              className="text-xs underline hover:opacity-80 ml-4 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <button
            onClick={() => handleTabChange("calendar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "calendar"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Google Calendar</span>
            {isCalendarConnected && (
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => handleTabChange("focus")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "focus"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Productivity Focus Logs</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: GOOGLE CALENDAR VIEW                                               */}
        {/* ========================================================================= */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            {isCalendarConnected === null ? (
              <div className="py-20 text-center text-xs text-slate-400">
                Checking Google Calendar connection status...
              </div>
            ) : isCalendarConnected ? (
              <GoogleCalendarView
                googleEmail={googleEmail}
                lastSyncedAt={lastSyncedAt}
                onDisconnect={handleDisconnectCalendar}
              />
            ) : (
              <GoogleCalendarConnect onConnected={checkCalendarStatus} />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRODUCTIVITY FOCUS LOGS                                           */}
        {/* ========================================================================= */}
        {activeTab === "focus" && (
          <div className="space-y-6">
            {/* Embedded Time Distribution Chart */}
            <TimeDistribution refreshTrigger={refreshKey} />

            {/* Category Filters */}
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

            {/* Recorded Focus Sessions List */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">
                  Recorded Focus Sessions
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Feeds LifeGauge Analytics
                </span>
              </div>

              {isLoadingEntries ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading focus entries...
                </div>
              ) : entries.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No focus blocks found. Click &ldquo;Log Focus Session&rdquo;
                  above to record your deep work.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="py-3.5 flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            {entry.category}
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {(entry.durationMin / 60).toFixed(1)} hrs (
                            {entry.durationMin} min)
                          </span>
                          {entry.startTime && entry.endTime && (
                            <span className="text-[11px] font-mono text-slate-500">
                              {entry.startTime} &ndash; {entry.endTime}
                            </span>
                          )}
                        </div>

                        {entry.description && (
                          <p className="text-xs text-slate-300">
                            {entry.description}
                          </p>
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
                        onClick={() => handleDeleteTimeEntry(entry.id)}
                        title="Delete Focus Block"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Productivity Logger Modal */}
      <TimeLoggerModal
        isOpen={isLoggerOpen}
        onClose={() => setIsLoggerOpen(false)}
        onLogged={() => setRefreshKey((k) => k + 1)}
      />

      <WindowDialogUpdation
        isOpen={!!timeEntryToDelete}
        title="Delete focus time block"
        message="Delete this focus time block?"
        confirmLabel="Delete"
        onConfirm={confirmDeleteTimeEntry}
        onCancel={() => setTimeEntryToDelete(null)}
      />

      <WindowDialogUpdation
        isOpen={isDisconnectConfirmOpen}
        title="Disconnect Google Calendar"
        message="Disconnect Google Calendar? Local cached events will be cleared. No Google events will be deleted."
        confirmLabel="Disconnect"
        onConfirm={confirmDisconnectCalendar}
        onCancel={() => setIsDisconnectConfirmOpen(false)}
      />
    </div>
  );
};
