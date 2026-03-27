"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";

import { NdviLegend } from "@/components/crop/NdviLegend";
import { healthColor } from "@/components/crop/ndvi-colors";
import { Badge } from "@/components/ui/badge";

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
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

    const labels = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap", opacity: 0.35 },
    ).addTo(map);

    L.control
      .layers(
        { Satellite: sat },
        { "Hybrid labels": labels },
        { collapsed: true },
      )
      .addTo(map);

    markerRef.current = L.marker([lat, lon]).addTo(map);

    ringRef.current = L.circle([lat, lon], {
      radius: 2000,
      color: ringColor,
      weight: 3,
      fillColor: ringColor,
      fillOpacity: 0.08,
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
    map.setView([lat, lon], Math.max(map.getZoom(), 12), { animate: true });

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
    <div className="relative h-[520px] w-full overflow-hidden rounded-xl border bg-muted">
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
        <Badge variant="secondary" className="pointer-events-auto">
          Lat {lat.toFixed(5)}
        </Badge>
        <Badge variant="secondary" className="pointer-events-auto">
          Lon {lon.toFixed(5)}
        </Badge>
        <Badge variant="secondary" className="pointer-events-auto">
          {year}-{String(month).padStart(2, "0")}
        </Badge>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3">
        <NdviLegend />
      </div>
    </div>
  );
}

