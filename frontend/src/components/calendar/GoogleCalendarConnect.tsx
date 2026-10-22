import React, { useState } from "react";
import { api } from "../../api/client";
import { Calendar, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface GoogleCalendarConnectProps {
  onConnected?: () => void;
}

export const GoogleCalendarConnect: React.FC<GoogleCalendarConnectProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get("/calendar/google/auth-url");
      if (res.data.success && res.data.authUrl) {
        // Redirect to Google OAuth consent screen
        window.location.href = res.data.authUrl;
      } else {
        setErrorMsg("Unable to retrieve authorization URL.");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          : "Failed to connect to Google Calendar. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.";
      setErrorMsg(msg || "Failed to initiate Google authorization.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-xl mx-auto space-y-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-xl shadow-emerald-500/20 mb-2">
          <Calendar className="h-8 w-8 text-slate-950" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-3">
            <Sparkles className="h-3 w-3" />
            <span>Two-Way Google Calendar Sync</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connect Your Primary Google Calendar
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Manage your daily events directly within LifeGauge. Any event you create, modify, or delete in
            LifeGauge or on your mobile Google Calendar stays bidirectionally in sync.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-left text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-xs font-bold text-white mb-1">Interactive Views</div>
            <div className="text-[11px] text-slate-400">Day, 4 Days, Week, Month, Year & Schedule agenda views.</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-xs font-bold text-white mb-1">Two-Way Sync</div>
            <div className="text-[11px] text-slate-400">Edits on your phone reflect in LifeGauge and vice-versa.</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Isolated
            </div>
            <div className="text-[11px] text-slate-400">Calendar events never pollute or alter productivity scores.</div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <span>Connect Google Calendar</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          We use Google OAuth 2.0 with minimal calendar permissions. Tokens are encrypted at rest with AES-256.
        </p>
      </div>
    </div>
  );
};
