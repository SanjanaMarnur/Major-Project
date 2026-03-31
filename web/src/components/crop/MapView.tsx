"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";

import { NdviLegend } from "@/components/crop/NdviLegend";
import { MapSearch } from "@/components/crop/MapSearch";

/* ── Types ── */
type LatLng = { lat: number; lng: number };

type Props = {
  polygon: LatLng[];
  year: number;
  month: number;
  resultLabel?: string | null;
  onAddVertex: (pt: LatLng) => void;
  onRemoveLastVertex: () => void;
  onClearPolygon: () => void;
  onPolygonComplete: (polygon: LatLng[]) => void;
};

type NdviMapResponse = {
  tileUrl: string;
  center: { lat: number; lon: number };
  bufferMeters: number;
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May",
  "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ── Vertex marker icon ── */
function createVertexIcon(index: number, isFirst: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="
      width: 24px; height: 24px;
      background: ${isFirst ? "#10b981" : "#22c55e"};
      border: 2.5px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: #fff;
      cursor: pointer;
    ">${index + 1}</div>`,
  });
}

/* ── Area computation (Shoelace formula on geodesic approx) ── */
function computeAreaHectares(pts: LatLng[]): number {
  if (pts.length < 3) return 0;
  // Convert to meters using simple equirectangular approx
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const meanLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const cosLat = Math.cos(toRad(meanLat));

  const xs = pts.map((p) => R * toRad(p.lng) * cosLat);
  const ys = pts.map((p) => R * toRad(p.lat));

  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += xs[i] * ys[j];
    area -= xs[j] * ys[i];
  }
  return Math.abs(area / 2) / 10000; // m² → hectares
}

export function MapView({
  polygon,
  year,
  month,
  resultLabel,
  onAddVertex,
  onRemoveLastVertex,
  onClearPolygon,
  onPolygonComplete,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const closedPolygonRef = useRef<L.Polygon | null>(null);
  const ndviRef = useRef<L.TileLayer | null>(null);

  const [drawingMode, setDrawingMode] = useState(false);
  const [isPolygonClosed, setIsPolygonClosed] = useState(false);
  const drawingModeRef = useRef(false);
  const isPolygonClosedRef = useRef(false);
  const polygonRef = useRef<LatLng[]>([]);

  // Keep refs in sync
  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);
  useEffect(() => {
    isPolygonClosedRef.current = isPolygonClosed;
  }, [isPolygonClosed]);
  useEffect(() => {
    polygonRef.current = polygon;
  }, [polygon]);

  const area = computeAreaHectares(polygon);

  /* ── Initialize Map ── */
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, {
      preferCanvas: true,
      zoomControl: true,
    }).setView([16.2008, 77.3616], 14);

    mapRef.current = map;

    const sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri" },
    );

    const streets = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap" },
    );

    sat.addTo(map);

    const labels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap & Carto" },
    ).addTo(map);

    L.control
      .layers(
        { Map: streets, Satellite: sat },
        { "Hybrid labels": labels },
        { collapsed: false, position: "topright" },
      )
      .addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!drawingModeRef.current || isPolygonClosedRef.current) return;

      const pts = polygonRef.current;
      const newPt: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };

      // Check if clicking near first vertex to close polygon
      if (pts.length >= 3) {
        const first = pts[0];
        const dist = map.latLngToContainerPoint([newPt.lat, newPt.lng])
          .distanceTo(map.latLngToContainerPoint([first.lat, first.lng]));
        if (dist < 20) {
          // Close the polygon
          isPolygonClosedRef.current = true;
          setIsPolygonClosed(true);
          onPolygonComplete(pts);
          return;
        }
      }

      onAddVertex(newPt);
    });

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync polygon visuals ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Clear old polygon
    if (closedPolygonRef.current) {
      map.removeLayer(closedPolygonRef.current);
      closedPolygonRef.current = null;
    }

    if (polygon.length === 0) {
      setIsPolygonClosed(false);
      isPolygonClosedRef.current = false;
      return;
    }

    // Add vertex markers
    polygon.forEach((pt, i) => {
      const marker = L.marker([pt.lat, pt.lng], {
        icon: createVertexIcon(i, i === 0),
        draggable: false,
      }).addTo(map);
      markersRef.current.push(marker);
    });

    // Draw polygon or polyline
    const latlngs = polygon.map((p) => [p.lat, p.lng] as L.LatLngTuple);

    if (isPolygonClosed && polygon.length >= 3) {
      closedPolygonRef.current = L.polygon(latlngs, {
        color: "#10b981",
        weight: 3,
        fillColor: "#10b981",
        fillOpacity: 0.15,
        dashArray: "",
      }).addTo(map);
    } else if (polygon.length >= 2) {
      polylineRef.current = L.polyline(latlngs, {
        color: "#10b981",
        weight: 2.5,
        dashArray: "8 4",
      }).addTo(map);
    }
  }, [polygon, isPolygonClosed]);

  /* ── Fetch NDVI overlay when polygon is closed ── */
  useEffect(() => {
    if (!isPolygonClosed || polygon.length < 3) return;
    let cancelled = false;

    async function run() {
      const map = mapRef.current;
      if (!map) return;

      const resp = await fetch("/api/ndvi-map", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          polygon: polygon.map((p) => ({ lat: p.lat, lon: p.lng })),
          year,
          month,
        }),
      });
      if (!resp.ok) return;
      const data = (await resp.json()) as NdviMapResponse;
      if (cancelled) return;
      if (!data?.tileUrl) return;

      if (ndviRef.current) map.removeLayer(ndviRef.current);
      ndviRef.current = L.tileLayer(data.tileUrl, { opacity: 1.0 }).addTo(map);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [polygon, year, month, isPolygonClosed]);

  const handleDrawPolygon = useCallback(() => {
    if (drawingMode) {
      // Toggle off
      setDrawingMode(false);
      drawingModeRef.current = false;
    } else {
      // Start drawing — clear old
      onClearPolygon();
      setIsPolygonClosed(false);
      isPolygonClosedRef.current = false;
      setDrawingMode(true);
      drawingModeRef.current = true;
      if (ndviRef.current && mapRef.current) {
        mapRef.current.removeLayer(ndviRef.current);
        ndviRef.current = null;
      }
    }
  }, [drawingMode, onClearPolygon]);

  const handleRemoveLast = useCallback(() => {
    setIsPolygonClosed(false);
    isPolygonClosedRef.current = false;
    onRemoveLastVertex();
    if (ndviRef.current && mapRef.current) {
      mapRef.current.removeLayer(ndviRef.current);
      ndviRef.current = null;
    }
  }, [onRemoveLastVertex]);

  const handleClearAll = useCallback(() => {
    setIsPolygonClosed(false);
    isPolygonClosedRef.current = false;
    setDrawingMode(false);
    drawingModeRef.current = false;
    onClearPolygon();
    if (ndviRef.current && mapRef.current) {
      mapRef.current.removeLayer(ndviRef.current);
      ndviRef.current = null;
    }
  }, [onClearPolygon]);

  const handleClosePolygon = useCallback(() => {
    if (polygon.length >= 3) {
      setIsPolygonClosed(true);
      isPolygonClosedRef.current = true;
      onPolygonComplete(polygon);
    }
  }, [polygon, onPolygonComplete]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border/60"
      style={{ height: "600px" }}
    >
      {/* Leaflet map container */}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ cursor: drawingMode && !isPolygonClosed ? "crosshair" : "" }}
      />

      {/* ── Search Bar (top-center) ── */}
      <div
        className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2"
        style={{ zIndex: 9999 }}
      >
        <MapSearch
          onSelect={(nextLat, nextLon) => {
            mapRef.current?.flyTo([nextLat, nextLon], 14, { animate: true });
          }}
        />
      </div>

      {/* ── Drawing Controls (left side, Farmonaut-style) ── */}
      <div
        className="absolute left-3 flex flex-col gap-2"
        style={{ zIndex: 9999, top: "120px" }}
      >
        {/* Draw Polygon Button */}
        <button
          onClick={handleDrawPolygon}
          style={{
            background: drawingMode ? "#10b981" : "rgba(255,255,255,0.95)",
            color: drawingMode ? "#fff" : "#1f2937",
            border: "none",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12,2 22,8.5 18,20 6,20 2,8.5" strokeLinejoin="round" />
          </svg>
          {drawingMode ? "Drawing…" : "Draw Field"}
        </button>

        {/* Remove Last Point */}
        {polygon.length > 0 && (
          <button
            onClick={handleRemoveLast}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            Remove Last Point
          </button>
        )}

        {/* Remove All Points */}
        {polygon.length > 0 && (
          <button
            onClick={handleClearAll}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            Remove All Points
          </button>
        )}

        {/* Close Polygon */}
        {drawingMode && polygon.length >= 3 && !isPolygonClosed && (
          <button
            onClick={handleClosePolygon}
            style={{
              background: "#0d9488",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            ✓ Close Polygon
          </button>
        )}
      </div>

      {/* ── Drawing mode hint banner ── */}
      {drawingMode && !isPolygonClosed && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            zIndex: 9999,
            top: "52px",
            background: "rgba(16, 185, 129, 0.92)",
            backdropFilter: "blur(8px)",
            borderRadius: "10px",
            padding: "8px 16px",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          {polygon.length === 0
            ? "Click on the map to place vertices"
            : polygon.length < 3
              ? `${polygon.length} point${polygon.length > 1 ? "s" : ""} placed — need ${3 - polygon.length} more`
              : `${polygon.length} points — click near first vertex or press Close`}
        </div>
      )}

      {/* ── Date badge (top-right, below layers control) ── */}
      <div
        className="pointer-events-none absolute right-3"
        style={{ zIndex: 800, top: "90px" }}
      >
        <div className="flex gap-1.5">
          <span
            className="pointer-events-auto text-[11px] font-medium"
            style={{
              background: "rgba(13, 20, 14, 0.82)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              border: "1px solid rgba(101, 188, 106, 0.2)",
              borderRadius: "6px",
              padding: "3px 8px",
              color: "rgba(180, 220, 180, 0.95)",
            }}
          >
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
      </div>

      {/* ── Bottom Bar: Area + Submit ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between"
        style={{
          zIndex: 9999,
          background: "rgba(13, 20, 14, 0.88)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(101, 188, 106, 0.2)",
          padding: "12px 20px",
        }}
      >
        {/* Area display */}
        <div className="flex items-center gap-3">
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "8px",
              padding: "6px 14px",
            }}
          >
            <span style={{ color: "#10b981", fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>
              Total Area:
            </span>
            <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700, marginLeft: "6px" }}>
              {polygon.length >= 3 ? area.toFixed(3) : "0.000"}
            </span>
            <span style={{ color: "rgba(180, 220, 180, 0.7)", fontSize: "11px", marginLeft: "4px" }}>
              hectares
            </span>
          </div>

          {polygon.length > 0 && (
            <span style={{ color: "rgba(180, 220, 180, 0.6)", fontSize: "11px" }}>
              {polygon.length} vertices
            </span>
          )}
        </div>


      </div>

      {/* ── NDVI Legend (above bottom bar) ── */}
      <div
        className="pointer-events-none absolute right-4"
        style={{ zIndex: 9999, bottom: "70px" }}
      >
        <NdviLegend />
      </div>
    </div>
  );
}
