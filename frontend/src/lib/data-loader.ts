import fs from "node:fs/promises";
import path from "node:path";

export type CropRecord = {
  Farm_ID: string;
  District: string;
  Location: string;
  Year: number;
  June: number;
  July: number;
  Aug: number;
  Sept: number;
  Oct: number;
  Seasonal_mean: number;
  Seasonal_max: number;
  Growth_rate: number;
  NDVI_range: number;
  Crop_health: "Healthy" | "Moderate" | "Stressed";
};

let cached: CropRecord[] | null = null;

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function loadCropRecords(): Promise<CropRecord[]> {
  if (cached) return cached;

  const filePath = path.join(process.cwd(), "..", "data", "crop_dataset.csv");
  const csv = await fs.readFile(filePath, "utf8");
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const headers = headerLine.split(",");

  cached = lines.map((line) => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });

    return {
      Farm_ID: row.Farm_ID,
      District: row.District,
      Location: row.Location,
      Year: toNumber(row.Year),
      June: toNumber(row.June),
      July: toNumber(row.July),
      Aug: toNumber(row.Aug),
      Sept: toNumber(row.Sept),
      Oct: toNumber(row.Oct),
      Seasonal_mean: toNumber(row.Seasonal_mean),
      Seasonal_max: toNumber(row.Seasonal_max),
      Growth_rate: toNumber(row.Growth_rate),
      NDVI_range: toNumber(row.NDVI_range),
      Crop_health: (row.Crop_health as CropRecord["Crop_health"]) ?? "Moderate",
    };
  });

  return cached;
}
