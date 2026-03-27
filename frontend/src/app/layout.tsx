import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Crop Health Monitor",
  description: "NDVI time-series crop health monitoring dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
