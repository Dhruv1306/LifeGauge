import React, { useState, useRef, useEffect } from "react";
import { useTheme, type Theme } from "../../context/ThemeContext";
import { Sun, Moon, Monitor, Check } from "lucide-react";

const THEME_OPTIONS: { value: Theme; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export const ThemeDropdown: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ActiveIcon =
    theme === "light" ? Sun :
    theme === "dark" ? Moon :
    resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Change appearance"
        aria-label="Toggle theme"
        className="flex items-center justify-center rounded-xl border border-olive-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-olive-700 dark:text-slate-400 hover:border-olive-300 dark:hover:border-slate-700 hover:bg-olive-100 dark:hover:bg-slate-800 hover:text-olive-900 dark:hover:text-slate-100 transition-colors shadow-sm"
      >
        <ActiveIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-olive-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden py-1">
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                theme === value
                  ? "text-olive-800 dark:text-emerald-400 bg-olive-100 dark:bg-slate-800 font-semibold"
                  : "text-olive-700 dark:text-slate-400 hover:bg-olive-50 dark:hover:bg-slate-800/60 hover:text-olive-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
              {theme === value && (
                <Check className="h-3 w-3 ml-auto shrink-0 text-olive-800 dark:text-emerald-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
