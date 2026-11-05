import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeDropdown } from "../components/common/ThemeDropdown";
import { Gauge, ArrowRight, Lock, Mail, ArrowLeft } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to original attempted page if redirected by ProtectedRoute, else /dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const validate = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return "Email is required.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return "Please enter a valid email address.";
    }
    if (!password) {
      return "Password is required.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errPayload = (err as any).response?.data?.error;
        if (typeof errPayload === "object" && errPayload?.message) {
          setErrorMsg(errPayload.message);
        } else if (typeof errPayload === "string") {
          setErrorMsg(errPayload);
        } else {
          setErrorMsg("Invalid credentials. Please verify your email and password.");
        }
      } else {
        setErrorMsg("Unable to reach the server. Please check your network connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-olive-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-olive-400/20 dark:bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-olive-500/15 dark:bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-olive-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header navigation bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-olive-700 dark:text-slate-400 hover:text-olive-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to LifeGauge</span>
          </Link>
          <ThemeDropdown />
        </div>

        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-olive-600 to-olive-800 dark:from-emerald-400 dark:to-emerald-600 shadow-lg shadow-olive-600/25 dark:shadow-emerald-500/25 mb-3">
            <Gauge className="h-7 w-7 text-white dark:text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-olive-900 dark:text-white flex items-center justify-center gap-1.5">
            Life<span className="text-olive-600 dark:text-emerald-400">Gauge</span>
          </h1>
          <p className="text-xs text-olive-600 dark:text-slate-400 mt-1">
            Sign in to access your personal analytics cockpit
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400 mb-5 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-olive-800 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-olive-600 dark:text-slate-500" />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-olive-200 dark:border-slate-700 bg-olive-50/50 dark:bg-slate-800/90 pl-9 pr-3 py-2 text-sm text-olive-900 dark:text-white placeholder-olive-400 dark:placeholder-slate-500 focus:border-olive-600 dark:focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-olive-800 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-olive-600 dark:text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-olive-200 dark:border-slate-700 bg-olive-50/50 dark:bg-slate-800/90 pl-9 pr-3 py-2 text-sm text-olive-900 dark:text-white placeholder-olive-400 dark:placeholder-slate-500 focus:border-olive-600 dark:focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-olive-600 hover:bg-olive-700 dark:bg-gradient-to-r dark:from-emerald-500 dark:to-emerald-600 dark:hover:from-emerald-400 dark:hover:to-emerald-500 py-3 text-sm font-semibold text-white dark:text-slate-950 transition-all shadow-lg shadow-olive-600/20 dark:shadow-emerald-500/20 disabled:opacity-50"
          >
            <span>{isSubmitting ? "Authenticating..." : "Access Cockpit"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-olive-600 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-semibold text-olive-800 dark:text-emerald-400 hover:underline transition-colors">
            Register here
          </Link>
        </div>

        <div className="mt-6 text-center text-[11px] text-olive-500 dark:text-slate-500 border-t border-olive-200 dark:border-slate-800/80 pt-4">
          Analytics-First Productivity Platform &bull; Data is strictly private
        </div>
      </div>
    </div>
  );
};
