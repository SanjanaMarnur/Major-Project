"use client";

import { Search, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export function MapSearch({ onSelect }: { onSelect: (lat: number, lon: number) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    async function search() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            debouncedQuery,
          )}&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        if (!cancelled) {
          setResults(data);
          setOpen(true);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    search();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-64 pointer-events-auto">
      <div className="relative">
        <input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          className="w-full h-9 pl-9 pr-8 text-sm bg-background border border-border/80 rounded-full shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-11 left-0 w-full bg-background border border-border/80 rounded-xl shadow-xl overflow-hidden z-[10000]">
          <ul className="max-h-60 overflow-y-auto py-1">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setOpen(false);
                    onSelect(parseFloat(r.lat), parseFloat(r.lon));
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors truncate"
                  title={r.display_name}
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
