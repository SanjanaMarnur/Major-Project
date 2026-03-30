from flask import Flask, request, jsonify, redirect
import ee

app = Flask(__name__)

# Initialize GEE
ee.Initialize(project='seventh-sunbeam-387910')

def classify_ndvi(mean):
    if mean < 0.18:
        return "Stressed"
    elif mean <= 0.33:
        return "Moderate"
    else:
        return "Healthy"

def get_crop_stage(month):
    # Kharif crop stages approximation
    if month in (6, 7): return "Vegetative Stage"
    elif month == 8: return "Flowering Stage"
    elif month == 9: return "Grain Filling Stage"
    elif month >= 10: return "Harvest/Maturity Stage"
    return "Unknown Stage"


def _build_geometry(data):
    """
    Build an ee.Geometry from the request data.
    Supports:
      - polygon: [{lat, lon}, ...] → ee.Geometry.Polygon
      - lat, lon → ee.Geometry.Point.buffer(800) (legacy fallback)
    """
    polygon = data.get("polygon")
    if polygon and len(polygon) >= 3:
        # Convert [{lat, lon}, ...] → [[lon, lat], ...] for GEE
        coords = [[pt["lon"], pt["lat"]] for pt in polygon]
        return ee.Geometry.Polygon([coords])
    else:
        lat = float(data["lat"])
        lon = float(data["lon"])
        return ee.Geometry.Point([lon, lat]).buffer(800)


# 🔥 NDVI FUNCTION
def get_ndvi_timeseries(geometry, year, current_month):

    collection = ee.ImageCollection("COPERNICUS/S2_HARMONIZED") \
        .filterBounds(geometry) \
        .filterDate(f"{year}-06-01", f"{year}-10-31") \
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))

    def add_ndvi(image):
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return image.addBands(ndvi)

    ndvi_collection = collection.map(add_ndvi)

    months_map = {6: "06", 7: "07", 8: "08", 9: "09", 10: "10"}
    ndvi_values = []

    for m in range(6, current_month + 1):
        month_str = months_map[m]

        monthly = ndvi_collection.filterDate(
            f"{year}-{month_str}-01",
            f"{year}-{month_str}-28"
        ).median()

        value = monthly.select("NDVI").reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geometry,
            scale=10
        ).get("NDVI")

        try:
            ndvi = value.getInfo()
            if ndvi is None:
                ndvi = 0
        except:
            ndvi = 0

        ndvi_values.append(ndvi)

    if len(ndvi_values) == 0:
        ndvi_values = [0]

    while len(ndvi_values) < 5:
        ndvi_values.append(ndvi_values[-1])

    return ndvi_values


# 🔥 NDVI IMAGE FOR MAP OVERLAY (single month)
def get_ndvi_image(geometry, year, month):
    # Restrict to the requested month (simple 1-month composite)
    start = ee.Date.fromYMD(year, month, 1)
    end = start.advance(1, "month")

    collection = (
        ee.ImageCollection("COPERNICUS/S2_HARMONIZED")
        .filterBounds(geometry)
        .filterDate(start, end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))
    )

    composite = collection.median()
    ndvi = composite.normalizedDifference(["B8", "B4"]).rename("NDVI")
    return ndvi.clip(geometry)





@app.route("/", methods=["GET", "POST"])
def index():
    # Next.js UI lives at port 3000. Redirect so users opening Flask root
    # don't see the legacy template UI.
    return redirect("http://127.0.0.1:3000", code=302)


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    """
    JSON API for Next.js frontend.
    Body: { polygon: [{lat, lon}, ...], year, month }
       or: { lat, lon, year, month } (legacy)
    Returns: { result, seasonal_mean }
    """
    data = request.get_json(silent=True) or {}
    try:
        year = int(data.get("year", 2021))
        month = int(data.get("month", 8))
        geometry = _build_geometry(data)
    except Exception as e:
        return jsonify({"error": f"Invalid parameters: {e}"}), 400

    ndvi_values = get_ndvi_timeseries(geometry, year, month)
    
    # Calculate seasonal and monthly statuses
    seasonal_mean = sum(ndvi_values) / len(ndvi_values) if len(ndvi_values) > 0 else 0
    overall_health = classify_ndvi(seasonal_mean)
    
    # Get the NDVI value for the currently selected month
    # NDVI values array corresponds to [June, July, August, September, October]
    month_idx = month - 6
    if 0 <= month_idx < len(ndvi_values):
        selected_month_ndvi = ndvi_values[month_idx]
    else:
        selected_month_ndvi = ndvi_values[-1] if len(ndvi_values) > 0 else 0
        
    selected_month_health = classify_ndvi(selected_month_ndvi)
    crop_stage = get_crop_stage(month)
    monthly_status = [classify_ndvi(val) for val in ndvi_values]

    return jsonify({
        "overall_health": overall_health,
        "seasonal_mean": round(seasonal_mean, 4),
        "selected_month_health": selected_month_health,
        "selected_month_ndvi": round(selected_month_ndvi, 4),
        "crop_stage": crop_stage,
        "ndvi": [round(v, 4) for v in ndvi_values],
        "monthly_status": monthly_status
    })


@app.route("/api/ndvi-map", methods=["GET", "POST"])
def ndvi_map():
    """
    Returns an Earth Engine tile layer descriptor (mapid/token) for NDVI.
    Accepts POST with polygon or GET with lat/lon (legacy).
    """
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            year = int(data.get("year", 2021))
            month = int(data.get("month", 8))
            geometry = _build_geometry(data)
            # Get center from polygon centroid
            polygon_pts = data.get("polygon", [])
            if polygon_pts:
                center_lat = sum(p["lat"] for p in polygon_pts) / len(polygon_pts)
                center_lon = sum(p["lon"] for p in polygon_pts) / len(polygon_pts)
            else:
                center_lat = float(data.get("lat", 0))
                center_lon = float(data.get("lon", 0))
        else:
            lat = float(request.args["lat"])
            lon = float(request.args["lon"])
            year = int(request.args.get("year", 2021))
            month = int(request.args.get("month", 8))
            geometry = ee.Geometry.Point([lon, lat]).buffer(2000)
            center_lat = lat
            center_lon = lon
    except Exception as e:
        return jsonify({"error": f"Invalid parameters: {e}"}), 400

    if month < 1 or month > 12:
        return jsonify({"error": "month must be between 1 and 12"}), 400

    ndvi = get_ndvi_image(geometry, year, month)
    vis = {
        "min": 0.0,
        "max": 1.0,
        "palette": [
            "d73027",
            "f46d43",
            "fdae61",
            "fee08b",
            "d9ef8b",
            "a6d96a",
            "1a9850",
        ],
    }

    map_id_dict = ee.Image(ndvi).getMapId(vis)

    tile_url = (
        "https://earthengine.googleapis.com/map/"
        + map_id_dict["mapid"]
        + "/{z}/{x}/{y}?token="
        + map_id_dict["token"]
    )

    return jsonify(
        {
            "tileUrl": tile_url,
            "vis": vis,
            "center": {"lat": center_lat, "lon": center_lon},
            "bufferMeters": 2000,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)