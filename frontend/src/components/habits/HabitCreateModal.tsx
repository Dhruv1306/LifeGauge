import React, { useState } from "react";
import { api } from "../../api/client";
import { X, Flame, Plus } from "lucide-react";

interface HabitCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const HabitCreateModal: React.FC<HabitCreateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [isEveryday, setIsEveryday] = useState(true);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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
    setIsSubmitting(true);
    setErrorMsg(null);

    const targetDays = isEveryday ? "ALL" : selectedDays.join(",");

    try {
      await api.post("/habits", {
        title: title.trim(),
        targetDays,
        startDate: startDate || new Date().toISOString().split("T")[0],
      });
      setTitle("");
      setStartDate(new Date().toISOString().split("T")[0]);
      onCreated();
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setErrorMsg((err as any).response?.data?.error || "Failed to create habit");
      } else {
        setErrorMsg("Failed to create habit");
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
            <h3 className="text-base font-semibold text-white">Create Daily Habit / Routine</h3>
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
              placeholder="e.g. Wake up at 6 AM, DSA Practice, Read 10 pages"
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
              required
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dayOptions.map((d) => {
                  const isSelected = selectedDays.includes(d.code);
                  return (
                    <button
                      type="button"
                      key={d.code}
                      onClick={() => toggleDay(d.code)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-mono transition-colors ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
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
              className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Add Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
