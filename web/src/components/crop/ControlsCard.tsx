"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  lat: number;
  lon: number;
  year: number;
  month: number;
  onChange: (next: { lat: number; lon: number; year: number; month: number }) => void;
  onAnalyze: () => void;
  analyzing?: boolean;
};

export function ControlsCard({
  lat,
  lon,
  year,
  month,
  onChange,
  onAnalyze,
  analyzing,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Inputs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              inputMode="decimal"
              value={String(lat)}
              onChange={(e) =>
                onChange({
                  lat: Number(e.target.value),
                  lon,
                  year,
                  month,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lon">Longitude</Label>
            <Input
              id="lon"
              inputMode="decimal"
              value={String(lon)}
              onChange={(e) =>
                onChange({
                  lat,
                  lon: Number(e.target.value),
                  year,
                  month,
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              inputMode="numeric"
              value={String(year)}
              onChange={(e) =>
                onChange({
                  lat,
                  lon,
                  year: Number(e.target.value),
                  month,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Month (6-10)</Label>
            <Input
              id="month"
              inputMode="numeric"
              value={String(month)}
              onChange={(e) =>
                onChange({
                  lat,
                  lon,
                  year,
                  month: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <Button className="w-full" onClick={onAnalyze} disabled={analyzing}>
          {analyzing ? "Analyzing…" : "Analyze"}
        </Button>
      </CardContent>
    </Card>
  );
}

