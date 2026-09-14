"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
  transparent?: boolean;
}

export function TopBar({
  title,
  showBack = false,
  rightAction,
  className,
  transparent = false,
}: TopBarProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-topbar items-center px-4",
        !transparent && "bg-white/90 backdrop-blur-sm border-b border-warm-100/50",
        transparent && "bg-transparent",
        className
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          className="mr-2 -ml-1 flex h-9 w-9 items-center justify-center rounded-xl hover:bg-warm-100 transition-colors"
          aria-label="返回"
        >
          <svg
            className="h-5 w-5 text-warm-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      )}

      {title && (
        <h1
          className={cn(
            "flex-1 text-base font-semibold text-warm-900",
            showBack ? "" : "text-center"
          )}
        >
          {title}
        </h1>
      )}

      {rightAction && (
        <div className="ml-auto">{rightAction}</div>
      )}
    </header>
  );
}
