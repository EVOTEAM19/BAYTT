"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number; // Porcentaje
    label?: string;
  };
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  title,
  value,
  trend,
  icon,
  onClick,
  className,
}: StatsCardProps) {
  const isPositive = trend ? trend.value >= 0 : null;
  const trendColor = isPositive === true ? "text-success" : isPositive === false ? "text-error" : "";

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-card-hover",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="text-sm font-medium text-foreground-muted">
          {title}
        </div>
        <div className="text-foreground-muted">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {Math.abs(trend.value)}% {trend.label || "vs período anterior"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardsGridProps {
  cards: StatsCardProps[];
  columns?: 2 | 3 | 4;
}

export function StatsCardsGrid({
  cards,
  columns = 4,
}: StatsCardsGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {cards.map((card, index) => (
        <StatsCard key={index} {...card} />
      ))}
    </div>
  );
}
