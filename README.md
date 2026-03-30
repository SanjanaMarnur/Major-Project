# Major Project — Crop Health Monitor

This repo now has:

- **Backend (Flask + Google Earth Engine)**: NDVI tiles + crop health prediction
- **Frontend (Next.js + shadcn/ui)**: elegant UI with satellite basemap, NDVI overlay, and prediction panel

## Run backend (Flask)

From the project root:

```bash
python app.py
```

Backend runs at `http://127.0.0.1:5000`.

## Run frontend (Next.js + shadcn)

In a new terminal:

```bash
cd web
npm run dev
```

Frontend runs at `http://127.0.0.1:3000`.

## Notes

- The Next.js app calls the backend via **Next API proxies**:
  - `GET /api/ndvi-map` → Flask `GET /api/ndvi-map`
  - `POST /api/analyze` → Flask `POST /api/analyze`
- If your Flask backend runs somewhere else, set:

```bash
cd web
set BACKEND_URL=http://127.0.0.1:5000
npm run dev
```

