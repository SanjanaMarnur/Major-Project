"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AnalyzePanel } from "@/components/crop/AnalyzePanel";
import { ControlsCard } from "@/components/crop/ControlsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyzeResponse } from "@/lib/types";

const ThemeToggle = dynamic(
  () => import("@/components/ThemeToggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

const MapView = dynamic(
  () => import("@/components/crop/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[580px] w-full rounded-2xl border border-border bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm">
        Loading map…
      </div>
    ),
  },
);

export function CropHealthPage() {
  const [lat, setLat] = useState(16.2008);
  const [lon, setLon] = useState(77.3616);
  const [year, setYear] = useState(2021);
  const [month, setMonth] = useState(8);

  const [result, setResult] = useState<string | null>(null);
  const [seasonalMean, setSeasonalMean] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickLocation = useCallback((nextLat: number, nextLon: number) => {
    setLat(nextLat);
    setLon(nextLon);
    setResult(null);
    setSeasonalMean(null);
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
      setSeasonalMean(data.seasonal_mean ?? null);
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
      {/* ── Top nav bar ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center gap-3">
          {/* Leaf icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/30">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-primary" stroke="currentColor" strokeWidth={2}>
              <path d="M12 22c0 0-8-4-8-12a8 8 0 0 1 16 0c0 8-8 12-8 12z" strokeLinejoin="round" />
              <line x1="12" y1="22" x2="12" y2="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Crop Health Monitor
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
              Satellite NDVI · Karnataka Region
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Hero strip ── */}
      <div className="border-b border-border/40 bg-gradient-to-r from-primary/8 via-transparent to-transparent">
        <div className="mx-auto max-w-7xl px-5 py-5">
          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
            Click anywhere on the map to select a field location, then press{" "}
            <span className="text-primary font-medium">Analyze</span> to predict
            crop vigor using Copernicus Sentinel-2 NDVI data.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* ─ Left panel ─ */}
          <div className="space-y-4">
            <ControlsCard
              lat={lat}
              lon={lon}
              year={year}
              month={month}
              onChange={onChange}
              onAnalyze={onAnalyze}
              analyzing={analyzing}
            />

            <AnalyzePanel result={result} seasonalMean={seasonalMean} loading={analyzing} error={error} />

            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  How to use
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2.5">
                {[
                  { icon: "📍", text: "Click on the map to pick a field location" },
                  { icon: "🛰️", text: "NDVI overlay loads for the chosen month" },
                  { icon: "🌿", text: "Press Analyze to predict crop health" },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">{item.icon}</span>
                    <span className="text-sm text-muted-foreground leading-snug">{item.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ─ Map panel ─ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Satellite · NDVI overlay
              </span>
              <span className="text-xs text-muted-foreground">
                {lat.toFixed(4)}, {lon.toFixed(4)} · {year}-{String(month).padStart(2, "0")}
              </span>
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
      </main>
    </div>
  );
}
