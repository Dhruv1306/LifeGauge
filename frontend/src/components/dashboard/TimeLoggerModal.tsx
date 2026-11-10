import React, { useEffect, useState } from "react";
import { api } from "../../api/client";
import { X, Clock, Check, Plus } from "lucide-react";
import { TOAST_EVENT } from "../common/ActionToast";

function parseTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (hour < 1 || hour > 12) return null;
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return hour * 60 + Number(match[2]);
}

function formatTime12(value: string): string {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return value;
  const hour24 = Number(match[1]);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${match[2]} ${suffix}`;
}

function toTime24(value: string): string | null {
  const minutes = parseTime(value);
  if (minutes === null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function calculateDuration(start: string, end: string): number {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes === null || endMinutes === null) return 0;
  return endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 1440 - startMinutes;
}

function formatDuration(minutes: number): string {
  if (!minutes) return "00:00";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export interface TimeLoggerInitialEntry {
  id: string;
  date: string;
  name?: string;
  category: string;
  durationMin: number;
  startTime?: string | null;
  endTime?: string | null;
}

interface TimeLoggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogged: () => void;
  initialDate?: string;
  initialEntry?: TimeLoggerInitialEntry | null;
  categories?: string[];
}

export const TimeLoggerModal: React.FC<TimeLoggerModalProps> = ({
  isOpen,
  onClose,
  onLogged,
  initialDate,
  initialEntry,
  categories = [],
}) => {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [customCategory, setCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [startTime, setStartTime] = useState("02:00 PM");
  const [endTime, setEndTime] = useState("03:00 PM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDate(initialEntry?.date || initialDate || new Date().toISOString().split("T")[0]);
    setName(initialEntry?.name || "");
    setCategory(initialEntry?.category || "General");
    setCustomCategoryName("");
    setStartTime(initialEntry?.startTime ? formatTime12(initialEntry.startTime) : "");
    setEndTime(initialEntry?.endTime ? formatTime12(initialEntry.endTime) : "");
    setCustomCategory(false);
    setErrorMsg(null);
  }, [initialDate, initialEntry, isOpen]);

  if (!isOpen) return null;

  const categoryOptions = Array.from(new Set(["General", ...categories, category]));
  const durationMin = calculateDuration(startTime, endTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Name is required.");
      return;
    }
    if (!durationMin) {
      setErrorMsg("Enter valid start and end times.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        date,
        name: name.trim(),
        category: (customCategory ? customCategoryName : category).trim(),
        durationMin,
        startTime: toTime24(startTime),
        endTime: toTime24(endTime),
      };
      if (initialEntry) {
        await api.patch(`/time-entries/${initialEntry.id}`, payload);
      } else {
        const response = await api.post("/time-entries", payload);
        if (response.data.promotionMessage) {
          window.dispatchEvent(
            new CustomEvent(TOAST_EVENT, {
              detail: { type: "success", message: response.data.promotionMessage },
            }),
          );
        }
      }
      onLogged();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setErrorMsg((err as any).response?.data?.error || "Failed to log time");
      } else {
        setErrorMsg("Failed to log time");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:items-center">
      <div className="flex w-full max-w-md max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">
              {initialEntry ? "Edit Focus / Time Block" : "Log Focus / Time Block"}
            </h3>
          </div>
          <button onClick={onClose} className="modal-close-button rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 min-h-0 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Focus Session" required
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
            <div className="flex items-center gap-2">
              <select value={category} onChange={(e) => { setCategory(e.target.value); setCustomCategory(false); }}
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none">
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" title="Add a new category" onClick={() => { setCustomCategory(true); setCustomCategoryName(""); }}
                className="rounded-xl border border-slate-700 p-2 text-slate-300 hover:border-emerald-500 hover:text-emerald-400"><Plus className="h-4 w-4" /></button>
            </div>
            {customCategory && (
              <input type="text" value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} placeholder="New category" required
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none" />
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Start</label>
              <input
                type="text"
                placeholder="02:00 PM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">End</label>
              <input
                type="text"
                placeholder="03:30 PM"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Duration</label>
              <input type="text" value={formatDuration(durationMin)} readOnly
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-cancel-button w-1/2 rounded-xl border border-slate-700 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSubmitting
                ? initialEntry ? "Saving..." : "Logging..."
                : initialEntry ? "Save Time Block" : "Log Time Block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
