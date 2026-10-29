import React, { useState } from "react";
import { api } from "../../api/client";
import { WindowDialogUpdation } from "../common/WindowDialogUpdation";
import {
  Calendar,
  RefreshCw,
  X,
  Trash2,
  Clock,
  MapPin,
  AlignLeft,
} from "lucide-react";

export interface CalendarEventData {
  id: string;
  googleEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  recurringEventId: string | null;
  status: string;
  timezone: string | null;
}

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialHour?: number; // 0-23
  eventToEdit?: CalendarEventData | null;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialDate,
  initialHour,
  eventToEdit,
}) => {
  const isEditing = !!eventToEdit;

  // Derive initial values
  const defaultDate = initialDate || new Date().toISOString().substring(0, 10);
  const defaultStartHour =
    initialHour !== undefined
      ? String(initialHour).padStart(2, "0") + ":00"
      : "09:00";
  const defaultEndHour =
    initialHour !== undefined
      ? String((initialHour + 1) % 24).padStart(2, "0") + ":00"
      : "10:00";

  const [title, setTitle] = useState(eventToEdit?.title || "");
  const [description, setDescription] = useState(
    eventToEdit?.description || "",
  );
  const [location, setLocation] = useState(eventToEdit?.location || "");
  const [isAllDay, setIsAllDay] = useState(eventToEdit?.isAllDay || false);

  const [date, setDate] = useState(() => {
    if (eventToEdit?.startDate) return eventToEdit.startDate;
    if (eventToEdit?.startTime)
      return new Date(eventToEdit.startTime).toISOString().substring(0, 10);
    return defaultDate;
  });

  const [startTime, setStartTime] = useState(() => {
    if (eventToEdit?.startTime) {
      const d = new Date(eventToEdit.startTime);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return defaultStartHour;
  });

  const [endTime, setEndTime] = useState(() => {
    if (eventToEdit?.endTime) {
      const d = new Date(eventToEdit.endTime);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return defaultEndHour;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter an event title.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        isAllDay,
      };

      if (isAllDay) {
        payload.startDate = date;
        payload.endDate = date; // single all-day event
      } else {
        const startDt = new Date(`${date}T${startTime}:00`);
        const endDt = new Date(`${date}T${endTime}:00`);

        if (endDt <= startDt) {
          setErrorMsg("End time must be after start time.");
          setIsSubmitting(false);
          return;
        }

        payload.startTime = startDt.toISOString();
        payload.endTime = endDt.toISOString();
        payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      if (isEditing && eventToEdit) {
        await api.patch(`/calendar/events/${eventToEdit.id}`, payload);
      } else {
        await api.post("/calendar/events", payload);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message
          : "Failed to save event. Please check Google Calendar connection.";
      setErrorMsg(msg || "Failed to save event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToEdit) return;
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToEdit) return;

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await api.delete(`/calendar/events/${eventToEdit.id}`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } })
              .response?.data?.error?.message
          : "Failed to delete event.";
      setErrorMsg(msg || "Failed to delete event.");
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              {isEditing
                ? "Edit Google Calendar Event"
                : "Create Google Calendar Event"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Team Standup, Project Sync, Dentist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-400" /> All-day event
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={isAllDay ? "sm:col-span-3" : "sm:col-span-1"}>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {!isAllDay && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" /> Location
              (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Google Meet, Office 302, Library"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <AlignLeft className="h-3.5 w-3.5 text-slate-400" /> Description
              (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Add details, notes, or agenda..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleting ? "Deleting..." : "Delete Event"}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {isSubmitting && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>
                  {isEditing ? "Save Changes" : "Create in Google Calendar"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <WindowDialogUpdation
        isOpen={isDeleteConfirmOpen}
        title="Delete calendar event"
        message={`Delete "${eventToEdit?.title || "this event"}" from Google Calendar?`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
};
