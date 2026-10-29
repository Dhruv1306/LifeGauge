import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { X, Sliders, Check, AlertCircle } from "lucide-react";

interface WeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeightsModal: React.FC<WeightsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateWeights } = useAuth();
  const [tasksWeight, setTasksWeight] = useState(user?.weightTasks ?? 40);
  const [focusWeight, setFocusWeight] = useState(user?.weightFocus ?? 35);
  const [habitsWeight, setHabitsWeight] = useState(user?.weightHabits ?? 25);
  const [targetMin, setTargetMin] = useState(user?.dailyFocusTargetMin ?? 120);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetToBaseline = () => {
    setTasksWeight(user?.weightTasks ?? 40);
    setFocusWeight(user?.weightFocus ?? 35);
    setHabitsWeight(user?.weightHabits ?? 25);
    setTargetMin(user?.dailyFocusTargetMin ?? 120);
    setErrorMsg(null);
  };

  // Synchronize draft values with user baseline whenever modal opens
  useEffect(() => {
    if (isOpen) {
      resetToBaseline();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const totalWeights = tasksWeight + focusWeight + habitsWeight;

  const handleCancel = () => {
    resetToBaseline();
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await updateWeights({
        weightTasks: tasksWeight,
        weightFocus: focusWeight,
        weightHabits: habitsWeight,
        dailyFocusTargetMin: targetMin,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err: unknown) {
      console.error("Failed to update weights:", err);
      const msg =
        err && typeof err === "object" && "response" in err
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (err as any).response?.data?.error?.message || (err as any).response?.data?.error
          : "Failed to save settings. Please try again.";
      setErrorMsg(msg || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Productivity Weights & Target</h3>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Customize how each pillar contributes to your personal daily productivity gauge. If a module has no activity scheduled on a day, its weight dynamically drops out!
          </p>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Task Completion Weight</span>
              <span className="font-mono text-emerald-400 font-semibold">{tasksWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tasksWeight}
              onChange={(e) => setTasksWeight(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Focus / Time Weight</span>
              <span className="font-mono text-emerald-400 font-semibold">{focusWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={focusWeight}
              onChange={(e) => setFocusWeight(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Habit Consistency Weight</span>
              <span className="font-mono text-emerald-400 font-semibold">{habitsWeight}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={habitsWeight}
              onChange={(e) => setHabitsWeight(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="rounded-lg bg-slate-800/60 p-3 flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Weight Sum:</span>
            <span
              className={`font-mono font-bold ${
                totalWeights === 100 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {totalWeights}% {totalWeights !== 100 && "(normalized dynamically)"}
            </span>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">
              Daily Focus Target (Minutes)
            </label>
            <input
              type="number"
              min="15"
              max="720"
              step="15"
              value={targetMin}
              onChange={(e) => setTargetMin(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400">
              Equivalent to {(targetMin / 60).toFixed(1)} hours per day.
            </span>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="w-1/2 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-1/2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4" /> Saved!
                </>
              ) : isSaving ? (
                "Saving..."
              ) : (
                "Apply Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
