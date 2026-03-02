import type { ReactNode } from "react";

interface ResponsiveWrapperProps {
  children: ReactNode;
}

/**
 * Mobile-first wrapper: full width on small screens, centered narrow column on desktop
 * so the app looks like a mobile app even when viewed on larger viewports.
 */
export function ResponsiveWrapper({ children }: ResponsiveWrapperProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 sm:mx-auto sm:max-w-md sm:shadow-lg">
      {children}
    </div>
  );
}
