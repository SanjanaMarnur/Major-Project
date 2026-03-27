import { NextRequest, NextResponse } from "next/server";
import { loadCropRecords } from "@/lib/data-loader";
import { predictFromNdvi } from "@/lib/predictor";
import { inferWithPickleModel } from "@/lib/pickle-inference";

export async function GET() {
  const records = await loadCropRecords();
  const locations = Array.from(new Set(records.map((r) => `${r.District}::${r.Location}`))).map((key) => {
    const [district, location] = key.split("::");
    return { district, location };
  });
  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { district, location, targetDate, sowingDate, ndvi } = body as {
    district: string;
    location: string;
    targetDate: string;
    sowingDate: string;
    ndvi: { June: number; July: number; Aug: number; Sept: number; Oct: number };
  };

  if (!district || !location || !targetDate || !sowingDate) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const records = await loadCropRecords();
  const scoped = records.filter((r) => r.District === district && r.Location === location);
  const source = scoped.length > 0 ? scoped : records;

  const fallback = predictFromNdvi(source, ndvi);
  let result = {
    ...fallback,
    modelSource: "fallback-knn" as "pickle-random-forest" | "fallback-knn",
    modelError: null as string | null,
  };

  try {
    const modelResult = await inferWithPickleModel(ndvi);
    result = {
      ...fallback,
      prediction: modelResult.prediction,
      confidence: modelResult.confidence ?? fallback.confidence,
      growthRate: modelResult.growthRate,
      ndviRange: modelResult.ndviRange,
      modelSource: "pickle-random-forest",
      modelError: null,
    };
  } catch (error) {
    // Keep fallback if pickle model is missing or Python inference fails.
    result.modelError = error instanceof Error ? error.message : "Unknown pickle inference error";
  }

  return NextResponse.json({
    ...result,
    district,
    location,
    targetDate,
    sowingDate,
  });
}
