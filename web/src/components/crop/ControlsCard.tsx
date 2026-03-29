"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type Props = {
  polygonVertices: number;
  date: Date;
  onChange: (date: Date) => void;
  onAnalyze: () => void;
  analyzing?: boolean;
};

export function ControlsCard({
  polygonVertices,
  date,
  onChange,
  onAnalyze,
  analyzing,
}: Props) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground uppercase tracking-wider text-xs">Parameters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-5">
        {/* Polygon Info */}
        <div>
          <p className="text-xs text-muted-foreground mb-2.5 font-medium">Field Region</p>
          <div
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
            style={{
              borderColor: polygonVertices >= 3 ? "rgba(16,185,129,0.4)" : "var(--border)",
              background: polygonVertices >= 3 ? "rgba(16,185,129,0.06)" : "transparent",
            }}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{
              background: polygonVertices >= 3 ? "rgba(16,185,129,0.15)" : "rgba(100,100,100,0.1)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={polygonVertices >= 3 ? "#10b981" : "currentColor"} strokeWidth="2">
                <polygon points="12,2 22,8.5 18,20 6,20 2,8.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {polygonVertices >= 3
                  ? `${polygonVertices} vertices defined`
                  : polygonVertices > 0
                    ? `${polygonVertices} point${polygonVertices > 1 ? "s" : ""} — need more`
                    : "No region drawn"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {polygonVertices >= 3
                  ? "Polygon ready for analysis"
                  : "Use 'Draw Field' on the map"}
              </p>
            </div>
          </div>
        </div>

        {/* Time range */}
        <div>
          <p className="text-xs text-muted-foreground mb-2.5 font-medium">Time range</p>
          <div className="w-full relative">
            <Popover>
              <PopoverTrigger
                className="w-full flex items-center justify-start h-9 text-left font-normal bg-background border border-input rounded-md px-3 hover:bg-accent hover:text-accent-foreground text-sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>
                  {format(date, "PPP")}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (!d) return;
                    onChange(d);
                  }}
                  defaultMonth={date}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Select an exact date to analyze crop health for that period.</p>
        </div>

        <Button
          className="w-full h-9 font-semibold tracking-wide transition-all duration-200"
          onClick={onAnalyze}
          disabled={analyzing || polygonVertices < 3}
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyzing…
            </span>
          ) : (
            "🌿 Analyze Crop Health"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
