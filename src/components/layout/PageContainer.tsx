import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  withBottomNav?: boolean;
  noPadding?: boolean;
}

export function PageContainer({
  children,
  className,
  withBottomNav = true,
  noPadding = false,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        "flex-1",
        !noPadding && "px-4 py-4",
        withBottomNav && "pb-[calc(80px+env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </main>
  );
}
