# AI Crop Health Frontend (Next.js + shadcn-style UI)

## Run locally

1. Install Node.js 20+.
2. From `frontend/`, install dependencies:
   - `npm install`
3. Start dev server:
   - `npm run dev`
4. Open `http://localhost:3000`

## What this frontend does

- Takes farm district/location, sowing date, and target prediction date.
- Captures NDVI time-series values (June-Oct).
- Calls `/api/predict` to infer crop health (`Healthy`, `Moderate`, `Stressed`).
- Shows confidence, feature metrics, and nearest historical records.

## Dataset integration

The API route reads data from `../data/crop_dataset.csv`.

If you already expose your trained Random Forest as an API, update `src/app/api/predict/route.ts` to call that endpoint and return the same response shape.
