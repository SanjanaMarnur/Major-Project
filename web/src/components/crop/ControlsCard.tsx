"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type Props = {
  lat: number;
  lon: number;
  year: number;
  month: number;
  onChange: (next: { lat: number; lon: number; year: number; month: number }) => void;
  onAnalyze: () => void;
  analyzing?: boolean;
};

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May",
  "June", "July", "August", "September", "October", "November", "December",
];

export function ControlsCard({
  lat,
  lon,
  year,
  month,
  onChange,
  onAnalyze,
  analyzing,
}: Props) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <span className="text-muted-foreground uppercase tracking-wider text-xs">Parameters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-5">
        {/* Coordinates */}
        <div>
          <p className="text-xs text-muted-foreground mb-2.5 font-medium">Coordinates</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lat" className="text-xs text-muted-foreground">Latitude</Label>
              <Input
                id="lat"
                inputMode="decimal"
                value={String(lat)}
                onChange={(e) =>
                  onChange({ lat: Number(e.target.value), lon, year, month })
                }
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lon" className="text-xs text-muted-foreground">Longitude</Label>
              <Input
                id="lon"
                inputMode="decimal"
                value={String(lon)}
                onChange={(e) =>
                  onChange({ lat, lon: Number(e.target.value), year, month })
                }
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Time range */}
        <div>
          <p className="text-xs text-muted-foreground mb-2.5 font-medium">Time range</p>
          <div className="w-full relative">
            <Popover>
              <PopoverTrigger
                className="w-full flex items-center justify-start h-9 text-left font-normal bg-background border border-input rounded-md px-3 hover:bg-accent hover:text-accent-foreground text-sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(year, month - 1, 15), "MMMM yyyy")}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[10000]" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(year, month - 1, 15)}
                  onSelect={(d) => {
                    if (!d) return;
                    onChange({
                      lat,
                      lon,
                      year: d.getFullYear(),
                      month: d.getMonth() + 1,
                    });
                  }}
                  defaultMonth={new Date(year, month - 1, 15)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Select a month between June and October for optimal NDVI analysis.</p>
        </div>

        <Button
          className="w-full h-9 font-semibold tracking-wide transition-all duration-200"
          onClick={onAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyzing…
            </span>
          ) : (
            "🌿 Analyze Crop Health"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
