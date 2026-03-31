export type AnalyzeResponse = {
  overall_health: string;
  seasonal_mean: number;
  selected_month_health: string;
  selected_month_ndvi: number;
  crop_stage: string;
  ndvi: number[];
  monthly_status: string[];
  tile_url?: string;
  center?: { lat: number; lon: number };
  polygon?: Array<{ lat: number; lon: number }>;
};
