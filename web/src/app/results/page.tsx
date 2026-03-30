"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
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
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyzeResponse } from "@/lib/types";

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

const MONTH_LABELS = ["June", "July", "August", "September", "October"];

function healthColor(status: string) {
  if (status.includes("Healthy")) return "#10b981"; // Emerald 500
  if (status.includes("Moderate")) return "#f59e0b"; // Amber 500
  return "#ef4444"; // Red 500
}

function getInterpretation(overallHealth: string, selectedHealth: string, cropStage: string): string {
  return `The crop is currently in the ${cropStage}. The overall health for the season is rated as ${overallHealth}. On the selected date, the crop condition is ${selectedHealth}. Monitor for pests and ensure adequate irrigation if the status reflects stress.`;
}

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const resultStr = sessionStorage.getItem("crop_analysis_result");
    const dStr = sessionStorage.getItem("crop_analysis_date");
    if (resultStr) {
      setData(JSON.parse(resultStr));
    }
    if (dStr) {
      setDateStr(dStr);
    }
  }, []);

  if (!mounted) return null;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh]">
        <p className="text-muted-foreground mb-4">No analysis data found. Please return to the map.</p>
        <Button variant="outline" onClick={() => router.push("/")}>Go back to Dashboard</Button>
      </div>
    );
  }

  const {
    overall_health,
    seasonal_mean,
    selected_month_health,
    selected_month_ndvi,
    crop_stage,
    ndvi,
    monthly_status,
  } = data;

  const colorOverall = healthColor(overall_health);
  const colorSelected = healthColor(selected_month_health);

  const chartData = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: "NDVI",
        data: ndvi,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        pointBackgroundColor: monthly_status.map(s => healthColor(s)),
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.35,
        fill: true,
        borderWidth: 2.5,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(13, 20, 14, 0.9)",
        titleColor: "#fff",
        callbacks: {
          label: (ctx: any) => `NDVI: ${ctx.parsed.y.toFixed(4)} - ${monthly_status[ctx.dataIndex]}`,
        },
      },
    },
    scales: {
      y: { min: 0, max: 1 },
    },
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-12">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Analysis Results
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {dateStr ? format(new Date(dateStr), "PPP") : "Unknown Date"}
            </p>
          </div>
        </div>
      </header>
      
      <main className="mx-auto max-w-5xl px-5 py-8 space-y-6">
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Overall Health */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase">Overall Season Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${colorOverall}15`, border: `1px solid ${colorOverall}40` }}>
                <span className="text-3xl">{overall_health === "Healthy" ? "🌿" : overall_health === "Moderate" ? "⚠️" : "🔴"}</span>
                <div>
                  <h3 className="font-bold text-2xl" style={{ color: colorOverall }}>{overall_health}</h3>
                  <p className="text-xs text-muted-foreground">Mean NDVI: <span className="font-medium text-foreground">{seasonal_mean.toFixed(4)}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Selected Date Health */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase">Health on {dateStr ? format(new Date(dateStr), "MMM yyyy") : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${colorSelected}15`, border: `1px solid ${colorSelected}40` }}>
                <span className="text-3xl">{selected_month_health === "Healthy" ? "🌿" : selected_month_health === "Moderate" ? "⚠️" : "🔴"}</span>
                <div>
                  <h3 className="font-bold text-xl" style={{ color: colorSelected }}>{selected_month_health}</h3>
                  <p className="text-xs text-muted-foreground">NDVI: <span className="font-medium text-foreground">{selected_month_ndvi.toFixed(4)}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crop Stage */}
        <Card className="border-border/60 overflow-hidden">
          <div className="bg-primary/10 border-b border-primary/20 px-6 py-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl">🌱</div>
             <div>
               <p className="text-sm text-primary font-semibold">Estimated Crop Stage</p>
               <h2 className="text-xl font-bold">{crop_stage}</h2>
             </div>
          </div>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getInterpretation(overall_health, selected_month_health, crop_stage)}
            </p>
          </CardContent>
        </Card>
        
        {/* NDVI Trend Chart */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium">NDVI Seasonal Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <Line data={chartData} options={chartOptions} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-6">
              {MONTH_LABELS.map((m, i) => (
                 <div key={m} className="p-3 rounded-lg border text-center" style={{ borderColor: `${healthColor(monthly_status[i])}40`, background: `${healthColor(monthly_status[i])}10` }}>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{m}</p>
                    <p className="text-sm font-bold" style={{ color: healthColor(monthly_status[i]) }}>{ndvi[i].toFixed(3)}</p>
                    <p className="text-[10px] mt-1 text-muted-foreground">{monthly_status[i]}</p>
                 </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
      </main>
    </div>
  );
}
