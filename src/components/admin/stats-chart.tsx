"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface StatsChartProps {
  title: string;
  data: ChartDataPoint[];
  series: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  type?: "line" | "bar";
  dateRange?: "7d" | "30d" | "90d";
  onRangeChange?: (range: "7d" | "30d" | "90d") => void;
}

export function StatsChart({
  title,
  data,
  series,
  type = "line",
  dateRange = "30d",
  onRangeChange,
}: StatsChartProps) {
  const [selectedRange, setSelectedRange] = useState<"7d" | "30d" | "90d">(
    dateRange
  );

  const handleRangeChange = (range: "7d" | "30d" | "90d") => {
    setSelectedRange(range);
    if (onRangeChange) {
      onRangeChange(range);
    }
  };

  const ChartComponent = type === "line" ? LineChart : BarChart;
  const DataComponent = type === "line" ? Line : Bar;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {onRangeChange && (
            <div className="flex gap-2">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <Button
                  key={range}
                  variant={selectedRange === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleRangeChange(range)}
                >
                  {range === "7d" ? "7 días" : range === "30d" ? "30 días" : "90 días"}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
            <XAxis
              dataKey="date"
              stroke="#A1A1A1"
              tick={{ fill: "#A1A1A1" }}
            />
            <YAxis stroke="#A1A1A1" tick={{ fill: "#A1A1A1" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#141414",
                border: "1px solid #2D2D2D",
                borderRadius: "8px",
                color: "#FFFFFF",
              }}
            />
            <Legend
              wrapperStyle={{ color: "#A1A1A1" }}
              iconType="line"
            />
            {series.map((serie) => (
              <DataComponent
                key={serie.key}
                type="monotone"
                dataKey={serie.key}
                name={serie.name}
                stroke={serie.color}
                fill={serie.color}
                strokeWidth={2}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

