import React, { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";

export const FullscreenToggle: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to change fullscreen mode", error);
    }
  };

  const Icon = isFullscreen ? Minimize : Maximize;
  const label = isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode";

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      title={label}
      aria-label={label}
      className="group flex items-center justify-center rounded-xl border border-olive-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-olive-700 dark:text-slate-400 hover:border-olive-300 dark:hover:border-slate-700 hover:bg-olive-100 dark:hover:bg-slate-800 hover:text-olive-900 dark:hover:text-slate-100 transition-all shadow-sm"
    >
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
    </button>
  );
};
