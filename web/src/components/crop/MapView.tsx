"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";

import { NdviLegend } from "@/components/crop/NdviLegend";
import { healthColor } from "@/components/crop/ndvi-colors";
import { MapSearch } from "@/components/crop/MapSearch";

type NdviMapResponse = {
  tileUrl: string;
  center: { lat: number; lon: number };
  bufferMeters: number;
};

type Props = {
  lat: number;
  lon: number;
  year: number;
  month: number;
  resultLabel?: string | null;
  onPickLocation?: (lat: number, lon: number) => void;
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May",
  "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function MapView({
  lat,
  lon,
  year,
  month,
  resultLabel,
  onPickLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const ndviRef = useRef<L.TileLayer | null>(null);
  const ringRef = useRef<L.Circle | null>(null);

  const ringColor = useMemo(() => healthColor(resultLabel), [resultLabel]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    // Fix default marker icons in Next bundling.
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
    }).setView([lat, lon], 11);

    mapRef.current = map;

    const sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri" },
    ).addTo(map);

    // Using CartoDB transparent labels (text and borders only) over satellite images
    // Looks incredibly clean and replaces opaque OSM tile blocks!
    const labels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap & Carto" },
    ).addTo(map);

    L.control
      .layers({ Satellite: sat }, { "Hybrid labels": labels }, { collapsed: true })
      .addTo(map);

    markerRef.current = L.marker([lat, lon]).addTo(map);

    ringRef.current = L.circle([lat, lon], {
      radius: 800,
      color: ringColor,
      weight: 2.5,
      fillColor: ringColor,
      fillOpacity: 0.1,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const nextLat = e.latlng.lat;
      const nextLon = e.latlng.lng;
      onPickLocation?.(nextLat, nextLon);
    });

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRef.current?.setLatLng([lat, lon]);
    
    // Removing the forced map.setView here. 
    // The camera will no longer violently jerk to center when the user drops a pin, 
    // restoring totally free touchpad/mouse map panning!

    if (ringRef.current) {
      ringRef.current.setLatLng([lat, lon]);
      ringRef.current.setStyle({ color: ringColor, fillColor: ringColor });
    }
  }, [lat, lon, ringColor]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const map = mapRef.current;
      if (!map) return;

      const resp = await fetch(
        `/api/ndvi-map?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`,
      );
      if (!resp.ok) return;
      const data = (await resp.json()) as NdviMapResponse;
      if (cancelled) return;
      if (!data?.tileUrl) return;

      if (ndviRef.current) map.removeLayer(ndviRef.current);
      ndviRef.current = L.tileLayer(data.tileUrl, { opacity: 0.65 }).addTo(map);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lat, lon, year, month]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-border/60"
      style={{ height: "580px" }}
    >
      {/* Leaflet map container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* ── Coordinate / date badges (top-left) ── */}
      <div
        className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2"
        style={{ zIndex: 9999 }}
      >
        <div className="flex gap-1.5">
          {[
            `${lat.toFixed(4)}°N`,
            `${lon.toFixed(4)}°E`,
            `${MONTH_NAMES[month]} ${year}`,
          ].map((label) => (
            <span
              key={label}
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
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Search Bar (top-center) ── */}
      <div
        className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2"
        style={{ zIndex: 9999 }}
      >
         <MapSearch onSelect={(nextLat, nextLon) => {
           mapRef.current?.flyTo([nextLat, nextLon], 14, { animate: true });
           onPickLocation?.(nextLat, nextLon);
         }} />
      </div>

      {/* ── NDVI Legend (bottom-right) — always visible, above all Leaflet controls ── */}
      <div
        className="pointer-events-none absolute bottom-4 right-4"
        style={{ zIndex: 9999 }}
      >
        <NdviLegend />
      </div>
    </div>
  );
}
