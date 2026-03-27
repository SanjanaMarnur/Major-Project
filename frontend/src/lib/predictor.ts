import { CropRecord } from "@/lib/data-loader";

export type NdviInput = {
  June: number;
  July: number;
  Aug: number;
  Sept: number;
  Oct: number;
};

export type PredictionResult = {
  prediction: CropRecord["Crop_health"];
  confidence: number;
  seasonalMean: number;
  ndviRange: number;
  growthRate: number;
  nearestExamples: Array<{
    district: string;
    location: string;
    year: number;
    label: CropRecord["Crop_health"];
    distance: number;
  }>;
};

const labelOrder: CropRecord["Crop_health"][] = ["Healthy", "Moderate", "Stressed"];

function euclidean(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, value, idx) => sum + (value - b[idx]) ** 2, 0));
}

export function predictFromNdvi(records: CropRecord[], input: NdviInput): PredictionResult {
  const seasonalMean = (input.June + input.July + input.Aug + input.Sept + input.Oct) / 5;
  const ndviRange = Math.max(input.June, input.July, input.Aug, input.Sept, input.Oct) - Math.min(input.June, input.July, input.Aug, input.Sept, input.Oct);
  const growthRate = (input.Oct - input.June) / 4;

  const target = [input.June, input.July, input.Aug, input.Sept, input.Oct, growthRate, ndviRange];

  const neighbors = records
    .map((r) => ({
      row: r,
      distance: euclidean(target, [r.June, r.July, r.Aug, r.Sept, r.Oct, r.Growth_rate, r.NDVI_range]),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 7);

  const scores: Record<CropRecord["Crop_health"], number> = {
    Healthy: 0,
    Moderate: 0,
    Stressed: 0,
  };

  neighbors.forEach((n) => {
    const weight = 1 / (n.distance + 1e-6);
    scores[n.row.Crop_health] += weight;
  });

  const prediction = labelOrder.reduce((best, label) => (scores[label] > scores[best] ? label : best), "Moderate" as CropRecord["Crop_health"]);
  const total = scores.Healthy + scores.Moderate + scores.Stressed;

  return {
    prediction,
    confidence: total > 0 ? (scores[prediction] / total) * 100 : 0,
    seasonalMean,
    ndviRange,
    growthRate,
    nearestExamples: neighbors.map((n) => ({
      district: n.row.District,
      location: n.row.Location,
      year: n.row.Year,
      label: n.row.Crop_health,
      distance: n.distance,
    })),
  };
}
