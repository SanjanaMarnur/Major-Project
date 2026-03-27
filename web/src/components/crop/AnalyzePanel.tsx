"use client";

import { useMemo } from "react";

import { healthColor } from "@/components/crop/ndvi-colors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  result: string | null;
  loading?: boolean;
  error?: string | null;
};

export function AnalyzePanel({ result, loading, error }: Props) {
  const color = useMemo(() => healthColor(result), [result]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Crop health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Analyzing…</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : result ? (
          <div className="flex items-center gap-2">
            <Badge style={{ backgroundColor: color, color: "white" }}>
              {result}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Ring color updates on the map.
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Click on the map and press Analyze.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

