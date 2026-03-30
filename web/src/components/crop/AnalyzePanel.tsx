"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { healthColor } from "@/components/crop/ndvi-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type Props = {
  result: string | null;
  seasonalMean?: number | null;
  ndviValues?: number[] | null;
  loading?: boolean;
  error?: string | null;
};

const MONTH_LABELS = ["June", "July", "August", "September", "October"];

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}
    />
  );
}

function getInterpretation(result: string | null, ndvi: number[]): string {
  if (!result) return "";
  const v = result.toLowerCase();
  const trend = ndvi.length >= 2 ? ndvi[ndvi.length - 1] - ndvi[0] : 0;
  const trendWord = trend > 0.05 ? "upward" : trend < -0.05 ? "downward" : "stable";

  if (v.includes("healthy") || v.includes("good")) {
    return `NDVI values show a ${trendWord} trend indicating strong vegetation vigor. The crop appears to be in healthy condition with adequate biomass and chlorophyll content throughout the growing season.`;
  }
  if (v.includes("moderate") || v.includes("average")) {
    return `NDVI values show a ${trendWord} trend indicating moderate vegetation condition. The crop shows average biomass levels — consider monitoring for potential stress factors like water availability or nutrient deficiency.`;
  }
  if (v.includes("poor") || v.includes("unhealthy") || v.includes("stressed")) {
    return `NDVI values show a ${trendWord} trend indicating vegetation stress. The crop may be experiencing water deficit, pest damage, or nutrient deficiency. Immediate field inspection is recommended.`;
  }
  return `NDVI trend is ${trendWord}. The crop condition has been assessed based on seasonal vegetation indices derived from Sentinel-2 satellite imagery.`;
}

export function AnalyzePanel({ result, seasonalMean, ndviValues, loading, error }: Props) {
  const color = useMemo(() => healthColor(result), [result]);
  const ndvi = ndviValues ?? [];

  const chartData = useMemo(
    () => ({
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "NDVI",
          data: ndvi.length > 0 ? ndvi : [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.35,
          fill: true,
          borderWidth: 2.5,
        },
      ],
    }),
    [ndvi],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13, 20, 14, 0.9)",
          titleColor: "#10b981",
          bodyColor: "#fff",
          borderColor: "rgba(16, 185, 129, 0.3)",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              `NDVI: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(4) : "N/A"}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(100,100,100,0.1)" },
          ticks: { color: "rgba(150,150,150,0.8)", font: { size: 11 } },
        },
        y: {
          min: 0,
          max: 1,
          grid: { color: "rgba(100,100,100,0.1)" },
          ticks: {
            color: "rgba(150,150,150,0.8)",
            font: { size: 11 },
            stepSize: 0.2,
          },
          title: {
            display: true,
            text: "NDVI",
            color: "rgba(150,150,150,0.8)",
            font: { size: 11 },
          },
        },
      },
    }),
    [],
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Crop Health Result
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
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
          <>
            {/* ── A. Large colored health status box ── */}
            <div
              className="rounded-xl p-4 flex items-center gap-4"
              style={{
                background: `${color}18`,
                border: `1.5px solid ${color}40`,
              }}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-lg"
                style={{ background: `${color}25` }}
              >
                <span className="text-2xl">
                  {result.toLowerCase().includes("healthy") ? "🌿" :
                   result.toLowerCase().includes("moderate") ? "⚠️" : "🔴"}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color }}>
                  {result}
                </p>
                {seasonalMean !== undefined && seasonalMean !== null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seasonal Mean NDVI: <span className="font-semibold text-foreground">{seasonalMean.toFixed(4)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* ── B. NDVI Values Table ── */}
            {ndvi.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                  Monthly NDVI Values
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {MONTH_LABELS.map((m, i) => (
                    <div
                      key={m}
                      className="rounded-lg text-center py-2 px-1"
                      style={{
                        background: "var(--muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p className="text-[10px] text-muted-foreground font-medium">{m.slice(0, 3)}</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {ndvi[i] !== undefined ? ndvi[i].toFixed(3) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── C. NDVI Line Chart ── */}
            {ndvi.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                  NDVI Trend
                </p>
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--muted)",
                    border: "1px solid var(--border)",
                    height: "180px",
                  }}
                >
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* ── D. Interpretation ── */}
            <div
              className="rounded-lg p-3"
              style={{
                background: `${color}08`,
                border: `1px solid ${color}20`,
              }}
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold" style={{ color }}>Interpretation: </span>
                {getInterpretation(result, ndvi)}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Draw a polygon and press <span className="text-primary font-medium">Analyze</span> to see results.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
