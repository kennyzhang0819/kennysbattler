"use client";

interface BarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  showValues?: boolean;
}

export function Bar({
  value,
  max,
  color = "bg-zinc-400",
  label,
  showValues = true,
}: BarProps) {
  const percent = Math.max(0, (value / max) * 100);

  return (
    <div className="w-full space-y-1">
      {(label || showValues) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-zinc-400">{label}</span>}
          {showValues && (
            <span className="text-white font-bold">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-zinc-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
