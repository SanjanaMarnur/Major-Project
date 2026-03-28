"use client";

import { useMemo } from "react";

import { healthColor } from "@/components/crop/ndvi-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  result: string | null;
  seasonalMean?: number | null;
  loading?: boolean;
  error?: string | null;
};

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
    />
  );
}

export function AnalyzePanel({ result, seasonalMean, loading, error }: Props) {
  const color = useMemo(() => healthColor(result), [result]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Crop Health Result
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="flex items-center gap-2.5">
            <svg className="animate-spin w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm text-muted-foreground">Running model inference…</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <span className="text-destructive text-sm">⚠</span>
            <p className="text-sm text-destructive leading-snug">{error}</p>
          </div>
        ) : result ? (
          <div className="flex items-center gap-3">
            <StatusDot color={color} />
            <div>
              <p
                className="text-base font-semibold flex items-center gap-2"
                style={{ color }}
              >
                {result}
                {seasonalMean !== undefined && seasonalMean !== null && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground" style={{ color: "var(--foreground)" }}>
                    {seasonalMean.toFixed(3)} Mean NDVI
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ring color on the map reflects this status
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a location and press <span className="text-primary font-medium">Analyze</span> to see results.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
