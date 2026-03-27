"use client";

import { useEffect, useMemo, useState } from "react";
import { Leaf, Sprout, TriangleAlert } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type LocationOption = { district: string; location: string };

type PredictionResponse = {
  prediction: "Healthy" | "Moderate" | "Stressed";
  confidence: number;
  seasonalMean: number;
  ndviRange: number;
  growthRate: number;
  district: string;
  location: string;
  targetDate: string;
  sowingDate: string;
  modelSource: "pickle-random-forest" | "fallback-knn";
  modelError?: string | null;
  nearestExamples: Array<{ district: string; location: string; year: number; label: string; distance: number }>;
};

const defaultNdvi = { June: 0.15, July: 0.22, Aug: 0.3, Sept: 0.4, Oct: 0.45 };

function scoreBadgeVariant(label: string): "healthy" | "moderate" | "stressed" {
  if (label === "Healthy") return "healthy";
  if (label === "Stressed") return "stressed";
  return "moderate";
}

export function PredictionDashboard() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [district, setDistrict] = useState("");
  const [location, setLocation] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [sowingDate, setSowingDate] = useState("");
  const [ndvi, setNdvi] = useState(defaultNdvi);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      const response = await fetch("/api/predict");
      const data = await response.json();
      setLocations(data.locations || []);
    };
    fetchLocations();
  }, []);

  const filteredLocations = useMemo(
    () => locations.filter((item) => !district || item.district === district),
    [district, locations]
  );

  const districts = useMemo(() => Array.from(new Set(locations.map((item) => item.district))), [locations]);

  async function submitPrediction() {
    setLoading(true);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district, location, targetDate, sowingDate, ndvi }),
      });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const chartData = [
    { month: "June", ndvi: ndvi.June },
    { month: "July", ndvi: ndvi.July },
    { month: "Aug", ndvi: ndvi.Aug },
    { month: "Sept", ndvi: ndvi.Sept },
    { month: "Oct", ndvi: ndvi.Oct },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background p-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Leaf className="h-6 w-6 text-primary" /> AI Crop Health Monitoring
            </CardTitle>
            <CardDescription>
              Enter farm location, sowing date, and NDVI time-series values to predict crop health for your selected date.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>District</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setLocation("");
                  }}
                >
                  <option value="">Select district</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Farm / Nearby Location</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">Select location</option>
                  {filteredLocations.map((entry) => (
                    <option key={`${entry.district}-${entry.location}`} value={entry.location}>
                      {entry.location}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Sowing Date</Label>
                <Input type="date" value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prediction Date</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {(Object.keys(ndvi) as Array<keyof typeof ndvi>).map((month) => (
                <div className="space-y-2" key={month}>
                  <Label>{month} NDVI</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={ndvi[month]}
                    onChange={(e) => setNdvi((prev) => ({ ...prev, [month]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>

            <div className="h-64 rounded-lg border border-border p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ndvi" stroke="hsl(var(--primary))" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <Button onClick={submitPrediction} disabled={loading || !district || !location || !targetDate || !sowingDate}>
              {loading ? "Predicting..." : "Predict Crop Health"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" /> Prediction Output
            </CardTitle>
            <CardDescription>AI output derived from your NDVI time series and historical nearest records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Submit input values to view crop-health prediction.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Health Status</span>
                  <Badge variant={scoreBadgeVariant(result.prediction)}>{result.prediction}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted p-2">Confidence: {result.confidence.toFixed(1)}%</div>
                  <div className="rounded-md bg-muted p-2">Seasonal Mean: {result.seasonalMean.toFixed(3)}</div>
                  <div className="rounded-md bg-muted p-2">NDVI Range: {result.ndviRange.toFixed(3)}</div>
                  <div className="rounded-md bg-muted p-2">Growth Rate: {result.growthRate.toFixed(3)}</div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Closest historical examples</p>
                  {result.nearestExamples.slice(0, 3).map((n, idx) => (
                    <div key={`${n.location}-${n.year}-${idx}`} className="rounded-md border p-2 text-xs">
                      {n.district} - {n.location} ({n.year})

                      <span className="text-muted-foreground">{n.label} | distance {n.distance.toFixed(3)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 rounded-md bg-secondary p-3 text-xs text-secondary-foreground">
                  <TriangleAlert className="mt-0.5 h-4 w-4" />
                  {result.modelSource === "pickle-random-forest" ? (
                    "Prediction generated using your trained pickle Random Forest model."
                  ) : (
                    <>
                      Pickle model could not be loaded, so fallback dataset-based inference is being used.
                      {result.modelError ? ` Error: ${result.modelError}` : ""}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
