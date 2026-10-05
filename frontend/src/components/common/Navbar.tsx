import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
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
    { name: "Cockpit", path: "/", icon: Gauge },
    { name: "Tasks", path: "/tasks", icon: CheckSquare },
    { name: "Habits", path: "/habits", icon: Flame },
    { name: "Time Blocks", path: "/time", icon: Clock },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Gauge className="h-5 w-5 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Life<span className="text-emerald-400 font-extrabold">Gauge</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 -mt-1">
                Analytics Cockpit
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 font-semibold shadow-inner border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* User profile, weights trigger & logout */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsWeightsOpen(true)}
              title="Adjust Productivity Weights & Daily Targets"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-colors"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Weights</span>
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <UserIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-200 hidden sm:inline">
                {user?.name || "User"}
              </span>
            </div>

            <button
              onClick={logout}
              title="Logout from LifeGauge"
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="flex md:hidden border-t border-slate-800/80 bg-slate-950 px-2 py-1 justify-around">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center py-1 px-3 text-[11px] rounded-lg ${
                  isActive ? "text-emerald-400 font-semibold" : "text-slate-400"
                }`}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                {link.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <WeightsModal isOpen={isWeightsOpen} onClose={() => setIsWeightsOpen(false)} />
    </>
  );
};
