import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const TOAST_EVENT = "lifegauge:toast";

interface ToastDetail {
  message: string;
  type?: "success" | "error";
}

export const ActionToast: React.FC = () => {
  // global notification component
  const [toast, setToast] = useState<ToastDetail | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (detail?.message) setToast(detail);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`action-toast fixed right-4 top-24 z-[60] flex min-h-20 w-fit min-w-72 max-w-[90vw] items-center gap-3.5 overflow-hidden rounded-3xl border px-4 py-5 text-sm shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl ring-1 md:top-20 md:max-w-[30vw] ${
        isError
          ? "border-rose-300/15 bg-rose-950/45 text-rose-200 ring-rose-300/10"
          : "border-white/15 bg-slate-900/55 text-emerald-200 ring-emerald-300/10"
      }`}
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 shrink-0 text-rose-300" />
      ) : (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
      )}
      <span className="flex-1 leading-6">{toast.message}</span>
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Dismiss notification"
        className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div
        className={`absolute inset-x-0 bottom-0 h-1 ${isError ? "bg-rose-950/60" : "bg-emerald-950/60"}`}
      >
        <div
          className={`h-full origin-left animate-[lifegauge-toast-progress_4s_linear_forwards] ${isError ? "bg-rose-300/80" : "bg-emerald-300/80"}`}
        />
      </div>
    </div>
  );
};

export { TOAST_EVENT };
