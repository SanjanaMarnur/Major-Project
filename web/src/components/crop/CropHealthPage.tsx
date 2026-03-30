"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ControlsCard } from "@/components/crop/ControlsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const ThemeToggle = dynamic(
  () => import("@/components/ThemeToggle").then((m) => m.ThemeToggle),
  { ssr: false }
);

const MapView = dynamic(
  () => import("@/components/crop/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full rounded-2xl border border-border bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm">
        Loading map…
      </div>
    ),
  },
);

type LatLng = { lat: number; lng: number };

export function CropHealthPage() {
  const router = useRouter();
  const [polygon, setPolygon] = useState<LatLng[]>([]);
  const [date, setDate] = useState<Date>(new Date(2021, 7, 15)); // Default Aug 15 2021

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAddVertex = useCallback((pt: LatLng) => {
    setPolygon((prev) => [...prev, pt]);
  }, []);

  const onRemoveLastVertex = useCallback(() => {
    setPolygon((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  const onClearPolygon = useCallback(() => {
    setPolygon([]);
    setError(null);
  }, []);

  const onChange = useCallback(
    (next: Date) => {
      setDate(next);
      setError(null);
    },
    [],
  );

  const onAnalyze = useCallback(async () => {
    if (polygon.length < 3) {
      toast.error("Draw a polygon with at least 3 vertices first");
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          polygon: polygon.map((p) => ({ lat: p.lat, lon: p.lng })),
          year: date.getFullYear(),
          month: date.getMonth() + 1,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Analyze failed");
      
      // Store in session storage to pass to Results page
      sessionStorage.setItem("crop_analysis_result", JSON.stringify(data));
      sessionStorage.setItem("crop_analysis_date", date.toISOString());
      
      toast.success("Analysis complete");
      router.push("/results");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analyze failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }, [polygon, date, router]);

  const onPolygonComplete = useCallback((completedPolygon: LatLng[]) => {
    setPolygon(completedPolygon);
  }, []);

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
              Satellite NDVI · Polygon Field Analysis
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
            Draw a polygon on the map to select your field boundary, then press{" "}
            <span className="text-primary font-medium">Submit</span> to analyze
            crop health using Copernicus Sentinel-2 NDVI data.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* ─ Left panel ─ */}
          <div className="space-y-4">
            <ControlsCard
              polygonVertices={polygon.length}
              date={date}
              onChange={onChange}
              onAnalyze={onAnalyze}
              analyzing={analyzing}
            />

            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  How to use
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2.5">
                {[
                  { icon: "✏️", text: "Click 'Draw Field' to start drawing a polygon" },
                  { icon: "📍", text: "Click on the map to place vertices" },
                  { icon: "🔷", text: "Click near the first point or 'Close Polygon' to finish" },
                  { icon: "🛰️", text: "NDVI overlay loads for the selected region" },
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
                Satellite · Polygon Field Selection
              </span>
              <span className="text-xs text-muted-foreground">
                {polygon.length} vertices · {date.getFullYear()}-{String(date.getMonth() + 1).padStart(2, "0")}
              </span>
            </div>
            <MapView
              polygon={polygon}
              year={date.getFullYear()}
              month={date.getMonth() + 1}
              resultLabel={null}
              onAddVertex={onAddVertex}
              onRemoveLastVertex={onRemoveLastVertex}
              onClearPolygon={onClearPolygon}
              onPolygonComplete={onPolygonComplete}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
