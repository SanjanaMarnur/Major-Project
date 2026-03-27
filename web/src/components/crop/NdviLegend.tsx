"use client";

import { NDVI_PALETTE } from "@/components/crop/ndvi-colors";
import { Card } from "@/components/ui/card";

export function NdviLegend() {
  return (
    <Card className="pointer-events-auto w-[220px] p-3">
      <div className="text-xs font-semibold">NDVI (Crop vigor)</div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 overflow-hidden rounded">
        {NDVI_PALETTE.map((c) => (
          <div key={c} className="h-2" style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Low</span>
        <span>High</span>
      </div>
    </Card>
  );
}

