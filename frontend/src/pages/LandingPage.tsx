import React from "react";
import { Link } from "react-router-dom";
import {
  Gauge,
  ArrowRight,
  TrendingUp,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Sliders,
  BarChart3,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20">
              <Gauge className="h-5 w-5 text-slate-950" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Life<span className="text-emerald-400">Gauge</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-md shadow-emerald-500/20"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[650px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 h-[350px] w-[450px] rounded-full bg-cyan-500/10 blur-[110px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 mb-6 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Personal Productivity & Life Analytics Cockpit</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Understand where your time went.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Track growth transparently.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed">
            LifeGauge unifies tasks, priority deadlines, focus sessions, and daily habits into one central cockpit.
            It transforms daily actions into deterministic, auditable metrics and visual momentum trends—not arbitrary scores.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 transition-all hover:scale-[1.02]"
            >
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-8 py-3.5 text-sm font-semibold text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition-all"
            >
              <span>Sign In to Cockpit</span>
            </Link>
          </div>

          {/* Quick Metrics Badge Row */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 backdrop-blur-sm">
              <div className="text-emerald-400 text-xs font-mono font-semibold uppercase">Pillar 1</div>
              <div className="text-base font-bold text-white mt-1">Task Completion</div>
              <div className="text-xs text-slate-400 mt-1">Weighted high-priority execution</div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 backdrop-blur-sm">
              <div className="text-cyan-400 text-xs font-mono font-semibold uppercase">Pillar 2</div>
              <div className="text-base font-bold text-white mt-1">Focus Time Blocks</div>
              <div className="text-xs text-slate-400 mt-1">Measured against personal targets</div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 backdrop-blur-sm">
              <div className="text-indigo-400 text-xs font-mono font-semibold uppercase">Pillar 3</div>
              <div className="text-base font-bold text-white mt-1">Habit Consistency</div>
              <div className="text-xs text-slate-400 mt-1">Scheduled daily punchcard tracking</div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 backdrop-blur-sm">
              <div className="text-amber-400 text-xs font-mono font-semibold uppercase">Engine</div>
              <div className="text-base font-bold text-white mt-1">Dynamic Normalization</div>
              <div className="text-xs text-slate-400 mt-1">Inactive modules reweight fairly</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="border-t border-slate-850 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-emerald-400">
              Core Principles
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for clarity, not judgment
            </p>
            <p className="mt-3 text-sm text-slate-400">
              LifeGauge is built on four architectural commitments to personal analytics integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Stock-Style Momentum</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  View daily performance as a financial-grade time series with 7-day moving averages and benchmark thresholds.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-emerald-400 font-mono">
                Pure deterministic math &bull; No guessing
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Rest Days vs Zero Output</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Legitimate rest days are distinguished from zero-output days. Rest days never penalize your trend lines or averages.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-cyan-400 font-mono">
                Respects human recovery cycles
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Sliders className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Customizable Weights</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  You decide how tasks, focus sessions, and habits contribute to your daily gauge. Change your weights anytime.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-indigo-400 font-mono">
                User-governed scoring model
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Habit Punchcard Matrix</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Interactive multi-day habit punchcard grid lets you log habits inline and inspect day-by-day consistency instantly.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-emerald-400 font-mono">
                One-click toggle logging
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Time Distribution</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Categorized time block tracking breaks down your deep work across Coding, Deep Work, Reading, Planning, and Exercise.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-amber-400 font-mono">
                Target vs Actual comparison
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Tenant Isolated & Private</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  All user data is completely private and secured with JWT Bearer tokens and strict database tenant isolation.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-[11px] text-teal-400 font-mono">
                Single-source-of-truth backend
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-8 sm:p-12 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to take command of your daily momentum?
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Start recording your tasks, focus blocks, and habits today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all"
              >
                <span>Get Started Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-800/80 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-all"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Gauge className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-white">LifeGauge</span> &bull; Personal Analytics Cockpit
          </div>
          <div className="text-slate-400">
            Deterministic calculations &bull; AI decision support &bull; Personal tracking indicator
          </div>
        </div>
      </footer>
    </div>
  );
};
