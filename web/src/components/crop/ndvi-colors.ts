export const NDVI_PALETTE = [
  "#d73027",
  "#f46d43",
  "#fdae61",
  "#fee08b",
  "#d9ef8b",
  "#a6d96a",
  "#1a9850",
] as const;

export function healthColor(label: string | null | undefined) {
  if (!label) return "#2c7be5";
  const v = label.toLowerCase();
  if (v.includes("healthy") || v.includes("good")) return "#1a9850";
  if (v.includes("moderate") || v.includes("average")) return "#fdae61";
  if (v.includes("poor") || v.includes("unhealthy") || v.includes("bad"))
    return "#d73027";
  return "#2c7be5";
}

