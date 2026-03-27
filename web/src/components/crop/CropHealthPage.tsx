"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AnalyzePanel } from "@/components/crop/AnalyzePanel";
import { ControlsCard } from "@/components/crop/ControlsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalyzeResponse } from "@/lib/types";

const MapView = dynamic(
  () => import("@/components/crop/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full rounded-xl border bg-muted" />
    ),
  },
);

export function CropHealthPage() {
  const [lat, setLat] = useState(16.2);
  const [lon, setLon] = useState(77.37);
  const [year, setYear] = useState(2021);
  const [month, setMonth] = useState(8);

  const [result, setResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickLocation = useCallback((nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
    setResult(null);
    setError(null);
  }, []);

  const onChange = useCallback(
    (next: { lat: number; lon: number; year: number; month: number }) => {
      setLat(next.lat);
      setLon(next.lon);
      setYear(next.year);
      setMonth(next.month);
      setError(null);
    },
    [],
  );

  const onAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat, lon, year, month }),
      });
      const data = (await resp.json()) as AnalyzeResponse & { error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Analyze failed");
      setResult(data.result ?? null);
      toast.success("Analysis complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analyze failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }, [lat, lon, year, month]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Crop monitoring</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Satellite NDVI Visualization
            </h1>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <ControlsCard
              lat={lat}
              lon={lon}
              year={year}
              month={month}
              onChange={onChange}
              onAnalyze={onAnalyze}
              analyzing={analyzing}
            />

            <AnalyzePanel result={result} loading={analyzing} error={error} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">How to use</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>- Click on the map to pick a location.</div>
                <div>- NDVI overlay updates for the selected month.</div>
                <div>- Press Analyze to predict crop health.</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Satellite (base) + NDVI (overlay)
            </div>
            <MapView
              lat={lat}
              lon={lon}
              year={year}
              month={month}
              resultLabel={result}
              onPickLocation={onPickLocation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

