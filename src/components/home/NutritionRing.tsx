"use client";

interface NutritionRingProps {
  recommended: number;
  target: number;
}

export function NutritionRing({ recommended, target }: NutritionRingProps) {
  const pct = Math.min(recommended / target, 1.2); // allow slight overshoot visually
  const displayPct = Math.min(pct, 1); // cap ring at 100%
  const isOver = recommended > target;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - displayPct);

  const ringColor = isOver ? "#EF4444" : "#2D9C7D"; // red if over target

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#ECEAE4" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-warm-400">推荐</span>
          <span className="text-lg font-bold text-warm-900">{recommended}</span>
          <span className="text-[10px] text-warm-400">kcal</span>
        </div>
      </div>
      <div className="text-xs text-warm-500 mt-1">
        目标 {target} kcal
        {isOver && <span className="text-red-500 ml-1">(偏高)</span>}
      </div>
    </div>
  );
}
