"use client";

import { NDVI_PALETTE } from "@/components/crop/ndvi-colors";

const STOPS = ["0.0", "0.2", "0.4", "0.6", "0.8", "1.0"] as const;

export function NdviLegend() {
  const gradient = `linear-gradient(to right, ${NDVI_PALETTE.join(", ")})`;

  return (
    <div
      className="pointer-events-auto"
      style={{
        background: "rgba(13, 20, 14, 0.88)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(101, 188, 106, 0.25)",
        borderRadius: "10px",
        padding: "10px 12px",
        minWidth: "200px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <span style={{ fontSize: "10px", color: "rgba(101, 188, 106, 0.9)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          NDVI
        </span>
        <span style={{ fontSize: "10px", color: "rgba(180, 210, 180, 0.6)", fontWeight: 400 }}>
          Vegetation Vigor
        </span>
      </div>

      {/* Gradient bar */}
      <div
        style={{
          height: "10px",
          borderRadius: "6px",
          background: gradient,
          marginBottom: "4px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}
      />

      {/* Scale labels */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {STOPS.map((s) => (
          <span key={s} style={{ fontSize: "9px", color: "rgba(180, 210, 180, 0.6)", lineHeight: 1 }}>
            {s}
          </span>
        ))}
      </div>

      {/* Legend items */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <span style={{ fontSize: "10px", color: "#d73027", fontWeight: 500 }}>◆ Bare/Dry</span>
        <span style={{ fontSize: "10px", color: "#fdae61", fontWeight: 500 }}>◆ Sparse</span>
        <span style={{ fontSize: "10px", color: "#1a9850", fontWeight: 500 }}>◆ Dense</span>
      </div>
    </div>
  );
}
