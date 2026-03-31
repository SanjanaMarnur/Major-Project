"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { NdviLegend } from "@/components/crop/NdviLegend";

type LatLng = { lat: number; lon: number };

type Props = {
  tileUrl?: string;
  center?: LatLng;
  polygon?: LatLng[];
};

export function ResultMap({ tileUrl, center, polygon }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const initCenter = center ? [center.lat, center.lon] : [16.2008, 77.3616];

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // Prevents zoom capture on scroll
    }).setView(initCenter as [number, number], 14);

    mapRef.current = map;

    const sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri" }
    ).addTo(map);

    const labels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      { attribution: "© OpenStreetMap & Carto" }
    ).addTo(map);

    if (tileUrl) {
      L.tileLayer(tileUrl, { opacity: 1.0 }).addTo(map);
    }

    if (polygon && polygon.length >= 3) {
      const latlngs = polygon.map((p) => [p.lat, p.lon] as L.LatLngTuple);
      // Outer drop shadow stroke
      L.polygon(latlngs, {
        color: "#09090b", // zinc-950
        weight: 5,
        opacity: 0.85,
        fillColor: "transparent",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Inner crisp stroke
      const poly = L.polygon(latlngs, {
        color: "#ffffff",
        weight: 2,
        fillColor: "transparent",
        dashArray: "4 6",
      }).addTo(map);

      map.fitBounds(poly.getBounds(), { padding: [40, 40] });
    }

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, [tileUrl, center, polygon]);

  return (
    <div className="relative w-full h-[350px] rounded-xl overflow-hidden border border-border/60">
      <div ref={containerRef} className="h-full w-full" />
      <div
        className="pointer-events-none absolute right-4"
        style={{ zIndex: 9999, bottom: "20px", transform: "scale(0.85)", transformOrigin: "bottom right" }}
      >
        <NdviLegend />
      </div>
    </div>
  );
}
