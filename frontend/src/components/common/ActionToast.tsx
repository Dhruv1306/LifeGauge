import React, { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const TOAST_EVENT = "lifegauge:toast";

interface ToastDetail {
  message: string;
}

export const ActionToast: React.FC = () => {
  // global notification component
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (detail?.message) setMessage(detail.message);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-24 z-[60] flex min-h-20 w-fit min-w-72 max-w-[90vw] items-center gap-3.5 overflow-hidden rounded-3xl border border-white/15 bg-slate-900/55 px-4 py-5 text-sm text-emerald-200 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl ring-1 ring-emerald-300/10 md:top-20 md:max-w-[30vw]"
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
      <span className="flex-1 leading-6">{message}</span>
      <button
        type="button"
        onClick={() => setMessage(null)}
        aria-label="Dismiss notification"
        className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-950/60">
        <div className="h-full origin-left animate-[lifegauge-toast-progress_4s_linear_forwards] bg-emerald-300/80" />
      </div>
    </div>
  );
};

export { TOAST_EVENT };
