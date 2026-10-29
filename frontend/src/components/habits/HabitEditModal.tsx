import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import { X, Flame, Save } from "lucide-react";

export interface HabitItem {
  id: string;
  title: string;
  targetDays: string;
  startDate?: string | null;
  order?: number;
  isActive: boolean;
  createdAt: string;
}

interface HabitEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  habit: HabitItem | null;
}

export const HabitEditModal: React.FC<HabitEditModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  habit,
}) => {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isEveryday, setIsEveryday] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
  ]);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prepopulate form on open or habit change
  useEffect(() => {
    if (habit) {
      setTitle(habit.title || "");
      setStartDate(habit.startDate ? habit.startDate.split("T")[0] : "");
      setIsActive(habit.isActive !== false);
      if (habit.targetDays === "ALL") {
        setIsEveryday(true);
        setSelectedDays(["MON", "TUE", "WED", "THU", "FRI"]);
      } else {
        setIsEveryday(false);
        const days = habit.targetDays ? habit.targetDays.split(",").map((s) => s.trim()) : [];
        setSelectedDays(days.length > 0 ? days : ["MON", "TUE", "WED", "THU", "FRI"]);
      }
      setErrorMsg(null);
    }
  }, [habit, isOpen]);


  if (!isOpen || !habit) return null;

  const dayOptions = [
    { code: "MON", label: "Mon" },
    { code: "TUE", label: "Tue" },
    { code: "WED", label: "Wed" },
    { code: "THU", label: "Thu" },
    { code: "FRI", label: "Fri" },
    { code: "SAT", label: "Sat" },
    { code: "SUN", label: "Sun" },
  ];

  const toggleDay = (code: string) => {
    if (selectedDays.includes(code)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== code));
      }
    } else {
      setSelectedDays([...selectedDays, code]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Habit name is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const targetDays = isEveryday ? "ALL" : selectedDays.join(",");

    try {
      await api.patch(`/habits/${habit.id}`, {
        title: title.trim(),
        targetDays,
        startDate: startDate || null,
        isActive,
      });

      onUpdated();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setErrorMsg((err as any).response?.data?.error || "Failed to update habit");
      } else {
        setErrorMsg("Failed to update habit");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Edit Habit / Routine</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Habit Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wake up at 6 AM, DSA Practice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tracking Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Days prior to this start date will not be counted as missed.
            </p>
          </div>


          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Scheduled Frequency
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsEveryday(true)}
                className={`py-2 px-3 text-xs rounded-xl border transition-all ${
                  isEveryday
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                    : "border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800"
                }`}
              >
                Everyday (7 Days)
              </button>
              <button
                type="button"
                onClick={() => setIsEveryday(false)}
                className={`py-2 px-3 text-xs rounded-xl border transition-all ${
                  !isEveryday
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                    : "border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800"
                }`}
              >
                Specific Days of Week
              </button>
            </div>

            {!isEveryday && (
              <div className="flex justify-between gap-1 bg-slate-800/40 p-2 rounded-xl border border-slate-700/60">
                {dayOptions.map((day) => {
                  const isSelected = selectedDays.includes(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      onClick={() => toggleDay(day.code)}
                      className={`h-8 w-8 text-[11px] font-medium rounded-lg transition-all ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                          : "text-slate-400 hover:bg-slate-700/60 hover:text-white"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/40">
            <div>
              <div className="text-xs font-medium text-white">Active Status</div>
              <div className="text-[11px] text-slate-400">Include in daily tracking & punchcard matrix</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 rounded-xl border border-slate-700 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50 shadow-md shadow-amber-600/20"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
