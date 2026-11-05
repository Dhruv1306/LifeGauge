import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../api/client";
import { CalendarEventData, CalendarEventModal } from "./CalendarEventModal";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  LogOut,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
} from "lucide-react";

export type CalendarViewMode = "day" | "week" | "month" | "year" | "schedule";

const formatLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface GoogleCalendarViewProps {
  googleEmail?: string | null;
  lastSyncedAt?: string | null;
  onDisconnect: () => void;
}

export const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({
  googleEmail,
  lastSyncedAt,
  onDisconnect,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [requiresReauthorization, setRequiresReauthorization] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(
    undefined,
  );
  const [modalInitialHour, setModalInitialHour] = useState<number | undefined>(
    undefined,
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(
    null,
  );

  // Date calculation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Visible date range based on viewMode
  const { rangeStart, rangeEnd, headerTitle } = useMemo(() => {
    let start: Date;
    let end: Date;
    let title = "";

    const monthNames = [
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
    ];

    if (viewMode === "day") {
      start = new Date(year, month, currentDate.getDate(), 0, 0, 0);
      end = new Date(year, month, currentDate.getDate(), 23, 59, 59);
      title = `${monthNames[month]} ${currentDate.getDate()}, ${year}`;
    } else if (viewMode === "week") {
      const dayOfWeek = currentDate.getDay(); // 0 (Sun) - 6 (Sat)
      start = new Date(year, month, currentDate.getDate() - dayOfWeek, 0, 0, 0);
      end = new Date(
        year,
        month,
        currentDate.getDate() - dayOfWeek + 6,
        23,
        59,
        59,
      );
      const endMonth = end.getMonth();
      title = `${monthNames[month].substring(0, 3)} ${start.getDate()} – ${monthNames[endMonth].substring(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (viewMode === "year") {
      start = new Date(year, 0, 1, 0, 0, 0);
      end = new Date(year, 11, 31, 23, 59, 59);
      title = `${year}`;
    } else {
      // Month & Schedule: full calendar month with padding
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      start = new Date(year, month, 1 - firstDay.getDay(), 0, 0, 0);
      end = new Date(
        year,
        month,
        lastDay.getDate() + (6 - lastDay.getDay()),
        23,
        59,
        59,
      );
      title = `${monthNames[month]} ${year}`;
    }

    return { rangeStart: start, rangeEnd: end, headerTitle: title };
  }, [currentDate, viewMode, year, month]);

  // Fetch events for range
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const startIso = rangeStart.toISOString();
      const endIso = rangeEnd.toISOString();
      const res = await api.get(
        `/calendar/events?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`,
      );
      if (res.data.success) {
        setEvents(res.data.events);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events", err);
      if (
        (err as { response?: { data?: { error?: { code?: string } } } })
          .response?.data?.error?.code === "CALENDAR_REAUTH_REQUIRED"
      ) {
        setRequiresReauthorization(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Sync handler
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await api.post("/calendar/sync", { force: true });
      setRequiresReauthorization(false);
      await fetchEvents();
    } catch (err) {
      console.error("Manual sync failed", err);
      if (
        (err as { response?: { data?: { error?: { code?: string } } } })
          .response?.data?.error?.code === "CALENDAR_REAUTH_REQUIRED"
      ) {
        setRequiresReauthorization(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReauthorize = async () => {
    try {
      const response = await api.get("/calendar/google/auth-url");
      if (response.data.success && response.data.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (err) {
      console.error("Failed to start Google Calendar reauthorization", err);
    }
  };

  // Navigation handlers
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else if (viewMode === "month" || viewMode === "schedule")
      d.setMonth(d.getMonth() - 1);
    else if (viewMode === "year") d.setFullYear(d.getFullYear() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else if (viewMode === "month" || viewMode === "schedule")
      d.setMonth(d.getMonth() + 1);
    else if (viewMode === "year") d.setFullYear(d.getFullYear() + 1);
    setCurrentDate(d);
  };

  // Open modal for slot
  const handleSlotClick = (dateStr: string, hour?: number) => {
    setSelectedEvent(null);
    setModalInitialDate(dateStr);
    setModalInitialHour(hour);
    setIsModalOpen(true);
  };

  // Open modal for event edit
  const handleEventClick = (event: CalendarEventData, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEvent(event);
    setModalInitialDate(undefined);
    setModalInitialHour(undefined);
    setIsModalOpen(true);
  };

  // Render subviews
  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl">
        {/* Left: Navigation and Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-600 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              title="Previous"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              title="Next"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {headerTitle}
          </h2>
        </div>

        {/* Center/Right: View Switcher and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Segmented Switcher */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {(
              ["day", "week", "month", "year", "schedule"] as CalendarViewMode[]
            ).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all font-medium ${
                  viewMode === mode
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync with Google Calendar"
            className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`}
            />
            <span className="hidden sm:inline">
              {isSyncing ? "Syncing..." : "Sync"}
            </span>
          </button>

          {/* Create Event CTA */}
          <button
            onClick={() => handleSlotClick(formatLocalDateKey(new Date()))}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create</span>
          </button>

          {/* Disconnect button */}
          <button
            onClick={onDisconnect}
            title="Disconnect Google Calendar"
            className="p-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Account Info Bar */}
      {googleEmail && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Connected as{" "}
              <strong className="text-slate-200">{googleEmail}</strong> (Primary
              Calendar)
            </span>
          </span>
          {lastSyncedAt && (
            <span className="text-slate-500">
              Last synced:{" "}
              {new Date(lastSyncedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      )}

      {requiresReauthorization && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Google Calendar permissions need updating before events can be
            synchronized.
          </span>
          <button
            type="button"
            onClick={handleReauthorize}
            className="rounded-xl bg-amber-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-amber-400"
          >
            Reconnect Google Calendar
          </button>
        </div>
      )}

      {/* Calendar Grid Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl overflow-hidden min-h-[500px]">
        {isLoading && events.length === 0 ? (
          <div className="py-24 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
            <span>Loading Google Calendar events...</span>
          </div>
        ) : viewMode === "month" ? (
          <MonthView
            currentDate={currentDate}
            events={events}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
          />
        ) : viewMode === "week" || viewMode === "day" ? (
          <TimeGridView
            currentDate={currentDate}
            daysCount={viewMode === "day" ? 1 : 7}
            events={events}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
          />
        ) : viewMode === "year" ? (
          <YearView
            currentDate={currentDate}
            events={events}
            onSelectDate={(d) => {
              setCurrentDate(d);
              setViewMode("day");
            }}
          />
        ) : (
          <ScheduleView
            events={events}
            onEventClick={handleEventClick}
            onEmptyCreate={() =>
              handleSlotClick(formatLocalDateKey(new Date()))
            }
          />
        )}
      </div>

      {/* Event Create / Edit Modal */}
      <CalendarEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchEvents}
        initialDate={modalInitialDate}
        initialHour={modalInitialHour}
        eventToEdit={selectedEvent}
      />
    </div>
  );
};

// ===========================================================================
// SUBVIEW 1: MONTH VIEW (7x5/6 grid matching Google Calendar)
// ===========================================================================

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEventData[];
  onSlotClick: (dateStr: string) => void;
  onEventClick: (event: CalendarEventData, e: React.MouseEvent) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onSlotClick,
  onEventClick,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const dayHeaders = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const todayStr = formatLocalDateKey(new Date());

  // Calculate calendar days matrix
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: {
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Previous month padding
    const prevPadding = firstDay.getDay();
    for (let i = prevPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const str = formatLocalDateKey(d);
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const str = formatLocalDateKey(d);
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: true,
        isToday: str === todayStr,
      });
    }

    // Next month padding (complete the 6th row if needed, minimum 35 or 42 cells)
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const str = formatLocalDateKey(d);
      days.push({
        date: d,
        dateStr: str,
        isCurrentMonth: false,
        isToday: str === todayStr,
      });
    }

    return days;
  }, [year, month, todayStr]);

  return (
    <div>
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 pb-2 mb-1 text-center text-xs font-semibold text-slate-400">
        {dayHeaders.map((dh) => (
          <div key={dh}>{dh}</div>
        ))}
      </div>

      {/* Month Cells Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-xl overflow-hidden border border-slate-800">
        {calendarDays.map((cell) => {
          const dayEvents = events.filter((ev) => {
            if (ev.isAllDay) return ev.startDate === cell.dateStr;
            if (ev.startTime)
              return (
                formatLocalDateKey(new Date(ev.startTime)) === cell.dateStr
              );
            return false;
          });

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSlotClick(cell.dateStr)}
              className={`min-h-[105px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                cell.isCurrentMonth
                  ? "bg-slate-900 hover:bg-slate-850"
                  : "bg-slate-950/70 hover:bg-slate-900/60"
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    cell.isToday
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : cell.isCurrentMonth
                        ? "text-slate-200"
                        : "text-slate-600"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* Event chips */}
              <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => onEventClick(ev, e)}
                    className="truncate rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                    title={ev.title}
                  >
                    {!ev.isAllDay && ev.startTime && (
                      <span className="mr-1 text-[10px] opacity-75 font-mono">
                        {new Date(ev.startTime).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <span>{ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ===========================================================================
// SUBVIEW 2: TIME GRID VIEW (Day / Week with 24h vertical axis)
// ===========================================================================

interface TimeGridViewProps {
  currentDate: Date;
  daysCount: number; // 1, 4, or 7
  events: CalendarEventData[];
  onSlotClick: (dateStr: string, hour?: number) => void;
  onEventClick: (event: CalendarEventData, e: React.MouseEvent) => void;
}

const TimeGridView: React.FC<TimeGridViewProps> = ({
  currentDate,
  daysCount,
  events,
  onSlotClick,
  onEventClick,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourHeight = 64;
  const timelineHeight = hours.length * hourHeight;
  const todayStr = formatLocalDateKey(new Date());

  const columns = useMemo(() => {
    const list: {
      date: Date;
      dateStr: string;
      label: string;
      isToday: boolean;
    }[] = [];
    const base = new Date(currentDate);
    if (daysCount === 7) base.setDate(base.getDate() - base.getDay());

    const dayShorts = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() + i,
      );
      const dateStr = formatLocalDateKey(date);
      list.push({
        date,
        dateStr,
        label: `${dayShorts[date.getDay()]} ${date.getDate()}`,
        isToday: dateStr === todayStr,
      });
    }
    return list;
  }, [currentDate, daysCount, todayStr]);

  const getTimedEvents = (dateStr: string) =>
    events.filter((event) => {
      if (event.isAllDay || !event.startTime) return false;
      return formatLocalDateKey(new Date(event.startTime)) === dateStr;
    });

  const layoutEvents = (dayEvents: CalendarEventData[]) => {
    const sorted = [...dayEvents].sort(
      (a, b) =>
        new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime(),
    );
    const active: Array<{ end: number; lane: number }> = [];
    const positioned: Array<{
      event: CalendarEventData;
      lane: number;
      laneCount: number;
    }> = [];
    let maxLane = 0;

    for (const event of sorted) {
      const start = new Date(event.startTime!).getTime();
      const end = event.endTime
        ? new Date(event.endTime).getTime()
        : start + 60 * 60 * 1000;
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].end <= start) active.splice(i, 1);
      }
      const usedLanes = new Set(active.map((item) => item.lane));
      let lane = 0;
      while (usedLanes.has(lane)) lane += 1;
      active.push({ end, lane });
      maxLane = Math.max(maxLane, lane + 1);
      positioned.push({ event, lane, laneCount: 1 });
    }

    return positioned.map((item) => ({ ...item, laneCount: maxLane || 1 }));
  };

  const now = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div
          className="grid border-b border-slate-800 pb-2"
          style={{
            gridTemplateColumns: `64px repeat(${daysCount}, minmax(0, 1fr))`,
          }}
        >
          <div className="pt-1 text-center text-[11px] font-mono text-slate-500">
            Local
          </div>
          {columns.map((column) => (
            <div
              key={column.dateStr}
              className="text-center text-xs font-semibold"
            >
              <span
                className={
                  column.isToday ? "text-emerald-300" : "text-slate-300"
                }
              >
                {column.label.split(" ")[0]}
              </span>
              <span
                className={
                  column.isToday
                    ? "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-slate-950"
                    : "block text-slate-400"
                }
              >
                {column.label.split(" ")[1]}
              </span>
            </div>
          ))}
        </div>

        <div
          className="grid border-b border-slate-800 pb-2"
          style={{
            gridTemplateColumns: `64px repeat(${daysCount}, minmax(0, 1fr))`,
          }}
        >
          <div className="self-center pr-2 text-right text-[10px] text-slate-500">
            All-day
          </div>
          {columns.map((column) => (
            <div key={column.dateStr} className="min-h-[28px] space-y-1 px-1">
              {events
                .filter(
                  (event) =>
                    event.isAllDay && event.startDate === column.dateStr,
                )
                .map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => onEventClick(event, e)}
                    className="w-full truncate rounded border border-emerald-500/50 bg-emerald-600/30 px-2 py-0.5 text-left text-[11px] font-medium text-emerald-300 hover:bg-emerald-600/50"
                  >
                    {event.title}
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className="max-h-[580px] overflow-y-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `64px repeat(${daysCount}, minmax(0, 1fr))`,
              height: `${timelineHeight}px`,
            }}
          >
            <div className="relative border-r border-slate-800/60">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-3 -translate-y-1/2 text-[11px] font-mono text-slate-500"
                  style={{ top: `${hour * hourHeight}px` }}
                >
                  {hour === 0
                    ? "12 AM"
                    : hour < 12
                      ? `${hour} AM`
                      : hour === 12
                        ? "12 PM"
                        : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {columns.map((column) => {
              const positioned = layoutEvents(getTimedEvents(column.dateStr));
              return (
                <div
                  key={column.dateStr}
                  className="relative border-l border-slate-800/60"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const minutes = Math.max(
                      0,
                      Math.floor(
                        ((event.clientY - rect.top) / hourHeight) * 60,
                      ),
                    );
                    onSlotClick(column.dateStr, Math.floor(minutes / 60));
                  }}
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0, transparent 63px, rgba(51, 65, 85, 0.7) 63px, rgba(51, 65, 85, 0.7) 64px)",
                  }}
                >
                  {positioned.map(({ event, lane, laneCount }) => {
                    const start = new Date(event.startTime!);
                    const end = event.endTime
                      ? new Date(event.endTime)
                      : new Date(start.getTime() + 60 * 60 * 1000);
                    const startMinutes =
                      start.getHours() * 60 + start.getMinutes();
                    const durationMinutes = Math.max(
                      20,
                      Math.round((end.getTime() - start.getTime()) / 60000),
                    );
                    const gap = 4;

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(e) => onEventClick(event, e)}
                        className="absolute z-10 overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/20 p-2 text-left text-[11px] text-white shadow-sm hover:bg-emerald-500/30"
                        style={{
                          top: `${(startMinutes / 60) * hourHeight + 2}px`,
                          height: `${Math.max(32, (durationMinutes / 60) * hourHeight - 4)}px`,
                          left: `calc(${(lane * 100) / laneCount}% + ${gap / 2}px)`,
                          width: `calc(${100 / laneCount}% - ${gap}px)`,
                        }}
                      >
                        <div className="truncate font-semibold text-emerald-300">
                          {event.title}
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-400">
                          {start.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {event.endTime &&
                            ` - ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                        </div>
                      </button>
                    );
                  })}

                  {column.isToday && now.getHours() >= 0 && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                      style={{
                        top: `${((now.getHours() * 60 + now.getMinutes()) / 60) * hourHeight}px`,
                      }}
                    >
                      <div className="-ml-1 h-2 w-2 rounded-full bg-rose-500" />
                      <div className="h-[2px] w-full bg-rose-500 shadow-sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// SUBVIEW 3: YEAR VIEW (12 mini-months matrix)
// ===========================================================================

interface YearViewProps {
  currentDate: Date;
  events: CalendarEventData[];
  onSelectDate: (date: Date) => void;
}

const YearView: React.FC<YearViewProps> = ({
  currentDate,
  events,
  onSelectDate,
}) => {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i);
  const monthNames = [
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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
      {months.map((m) => {
        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0);
        const padding = firstDay.getDay();

        return (
          <div
            key={m}
            className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
          >
            <h4 className="text-xs font-bold text-white text-center mb-2">
              {monthNames[m]}
            </h4>
            <div className="grid grid-cols-7 text-[10px] font-mono text-slate-500 text-center mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-[11px] text-center">
              {Array.from({ length: padding }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {Array.from({ length: lastDay.getDate() }, (_, i) => i + 1).map(
                (d) => {
                  const dateObj = new Date(year, m, d);
                  const str = formatLocalDateKey(dateObj);
                  const hasEvents = events.some((ev) => {
                    if (ev.isAllDay) return ev.startDate === str;
                    if (ev.startTime)
                      return formatLocalDateKey(new Date(ev.startTime)) === str;
                    return false;
                  });

                  return (
                    <button
                      key={d}
                      onClick={() => onSelectDate(dateObj)}
                      className={`h-6 w-6 mx-auto rounded-full flex items-center justify-center transition-all ${
                        hasEvents
                          ? "bg-emerald-500/30 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-slate-950"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {d}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ===========================================================================
// SUBVIEW 4: SCHEDULE VIEW (Chronological agenda list)
// ===========================================================================

interface ScheduleViewProps {
  events: CalendarEventData[];
  onEventClick: (event: CalendarEventData) => void;
  onEmptyCreate: () => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  events,
  onEventClick,
  onEmptyCreate,
}) => {
  // Sort events chronologically
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aTime = a.startTime
        ? new Date(a.startTime).getTime()
        : new Date(`${a.startDate}T00:00:00`).getTime();
      const bTime = b.startTime
        ? new Date(b.startTime).getTime()
        : new Date(`${b.startDate}T00:00:00`).getTime();
      return aTime - bTime;
    });
  }, [events]);

  if (sortedEvents.length === 0) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <CalendarIcon className="h-8 w-8 mx-auto text-slate-600 mb-2" />
        <p>No upcoming events found in this period.</p>
        <button
          onClick={onEmptyCreate}
          className="mt-3 inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create an Event</span>
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto">
      {sortedEvents.map((ev) => {
        const dateStr =
          ev.isAllDay && ev.startDate
            ? ev.startDate
            : ev.startTime
              ? new Date(ev.startTime).toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "";

        return (
          <div
            key={ev.id}
            onClick={() => onEventClick(ev)}
            className="py-3 px-2 flex items-start justify-between hover:bg-slate-850/50 rounded-xl transition-colors cursor-pointer group"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {ev.title}
                </span>
                {ev.isAllDay && (
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-400 font-medium">
                    All day
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3 text-slate-500" />
                  {dateStr}
                  {!ev.isAllDay && ev.startTime && (
                    <span>
                      {" "}
                      at{" "}
                      {new Date(ev.startTime).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </span>
                {ev.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    {ev.location}
                  </span>
                )}
              </div>

              {ev.description && (
                <p className="text-xs text-slate-400 line-clamp-2 max-w-xl">
                  {ev.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
