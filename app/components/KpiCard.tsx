"use client";

import { cn } from "@/app/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number; // positive = good, negative = bad
  trendLabel?: string;
  icon?: React.ReactNode;
  color?: "teal" | "green" | "amber" | "red" | "purple";
  description?: string;
  className?: string;
}

const colorMap = {
  teal: "text-cyan-400",
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  purple: "text-purple-400",
};

export default function KpiCard({
  title,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  color = "teal",
  description,
  className,
}: KpiCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;
  const trendColor = isPositiveTrend ? "text-emerald-400" : "text-red-400";

  return (
    <div
      className={cn(
        "kpi-card bg-card border border-border rounded-lg p-4 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        {icon && (
          <div className={cn("opacity-70", colorMap[color])}>{icon}</div>
        )}
      </div>

      <div className="flex items-end gap-1.5">
        <span className={cn("text-2xl font-bold leading-none", colorMap[color])}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-muted-foreground mb-0.5">{unit}</span>}
      </div>

      {(trend !== undefined || description) && (
        <div className="flex items-center gap-1.5">
          {trend !== undefined && (
            <>
              <TrendIcon size={12} className={trendColor} />
              <span className={cn("text-xs font-medium", trendColor)}>
                {Math.abs(trend)}%
              </span>
            </>
          )}
          {trendLabel && (
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          )}
          {description && !trendLabel && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
