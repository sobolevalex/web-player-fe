import Link from "next/link";
import { Home, Library, Settings } from "lucide-react";

/**
 * Sticky bottom navigation bar. Safe-area padding for notched devices.
 * Can later evolve into a player bar with now-playing and controls.
 */
export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 mx-auto w-full max-w-md border-t border-zinc-200 bg-white pb-3 pt-2 dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Main navigation"
    >
      <div className="flex justify-around">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          aria-label="Home"
        >
          <Home className="h-6 w-6" aria-hidden />
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href="/"
          className="flex flex-col items-center gap-1 text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          aria-label="Playlist"
        >
          <Library className="h-6 w-6" aria-hidden />
          <span className="text-xs">Playlist</span>
        </Link>
        <Link
          href="#"
          className="flex flex-col items-center gap-1 text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" aria-hidden />
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
