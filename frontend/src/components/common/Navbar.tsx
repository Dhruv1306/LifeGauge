import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ThemeDropdown } from "./ThemeDropdown";
import { FullscreenToggle } from "./FullscreenToggle";
import { WeightsModal } from "./WeightsModal";
import {
  Gauge,
  CheckSquare,
  Flame,
  Clock,
  LogOut,
  Sliders,
  User as UserIcon,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isWeightsOpen, setIsWeightsOpen] = useState(false);

  const navLinks = [
    { name: "Cockpit",     path: "/dashboard", icon: Gauge },
    { name: "Tasks",       path: "/tasks",     icon: CheckSquare },
    { name: "Habits",      path: "/habits",    icon: Flame },
    { name: "Time Blocks", path: "/time",      icon: Clock },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[var(--navbar-border)] backdrop-blur-md"
           style={{ backgroundColor: "var(--navbar-bg)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 h-16 gap-2">
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Gauge className="h-5 w-5 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center">
                Life<span className="text-emerald-600 dark:text-emerald-400 font-bold">Gauge</span>
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-widest text-[var(--text-muted)] -mt-1">
                Cockpit
              </span>
            </div>
          </Link>

          {/* Navigation Links - Desktop & Tablet */}
          <div className="hidden md:flex items-center gap-1 bg-[var(--bg-surface-2)]/60 p-1.5 rounded-xl border border-[var(--border)]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-inner border border-emerald-500/20"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]/50"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side: Theme toggle, Weights, User, Logout */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Theme & Fullscreen controls */}
            <FullscreenToggle />
            <ThemeDropdown />

            {/* Only show Weights/User/Logout when authenticated */}
            {user && (
              <>
                <button
                  onClick={() => setIsWeightsOpen(true)}
                  title="Adjust Productivity Weights & Daily Targets"
                  className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Weights</span>
                </button>

                <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/70 px-2.5 sm:px-3 py-1.5 max-w-[120px] sm:max-w-[160px]">
                  <UserIcon className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate hidden sm:inline">
                    {user?.name || "User"}
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Logout from LifeGauge"
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 text-[var(--text-muted)] hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400 dark:hover:border-rose-900/50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile bottom nav bar */}
        <div className="flex md:hidden border-t border-[var(--border)] bg-[var(--bg-canvas)] px-1 py-1.5 justify-around items-center">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center py-1 px-2.5 text-[10px] sm:text-[11px] rounded-lg transition-colors min-w-[56px] ${
                  isActive ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                <span className="truncate">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <WeightsModal isOpen={isWeightsOpen} onClose={() => setIsWeightsOpen(false)} />
    </>
  );
};
