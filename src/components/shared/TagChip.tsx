import { cn } from "@/lib/utils";

interface TagChipProps {
  label: string;
  variant?: "default" | "primary" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

export function TagChip({
  label,
  variant = "default",
  size = "sm",
  className,
}: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        variant === "default" && "bg-warm-100 text-warm-700",
        variant === "primary" && "bg-primary-50 text-primary-700",
        variant === "success" && "bg-green-50 text-green-700",
        variant === "warning" && "bg-amber-50 text-amber-700",
        className
      )}
    >
      {label}
    </span>
  );
}
