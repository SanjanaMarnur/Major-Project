from flask import Flask, request, jsonify, redirect
import ee
import joblib
import numpy as np

app = Flask(__name__)

# Initialize GEE
ee.Initialize(project='seventh-sunbeam-387910')

# Load model
model = joblib.load("model/crop_health_model.pkl")
label_encoder = joblib.load("model/label_encoder.pkl")


# 🔥 NDVI FUNCTION
def get_ndvi_timeseries(lat, lon, year, current_month):

    geometry = ee.Geometry.Point([lon, lat]).buffer(2000)

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
def get_ndvi_image(lat, lon, year, month):
    geometry = ee.Geometry.Point([lon, lat]).buffer(2000)

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


# 🔥 FEATURE ENGINEERING
def create_features(ndvi_values):
    june, july, aug, sept, octo = ndvi_values
    growth_rate = sept - june
    ndvi_range = max(ndvi_values) - min(ndvi_values)
    return [june, july, aug, sept, octo, growth_rate, ndvi_range]


@app.route("/", methods=["GET", "POST"])
def index():
    # Next.js UI lives at port 3000. Redirect so users opening Flask root
    # don't see the legacy template UI.
    return redirect("http://127.0.0.1:3000", code=302)


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    """
    JSON API for Next.js frontend.
    Body: { lat, lon, year, month }
    Returns: { result }
    """
    data = request.get_json(silent=True) or {}
    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
        year = int(data.get("year", 2021))
        month = int(data.get("month", 8))
    except Exception as e:
        return jsonify({"error": f"Invalid parameters: {e}"}), 400

    ndvi_values = get_ndvi_timeseries(lat, lon, year, month)
    features = create_features(ndvi_values)
    pred = model.predict([features])[0]
    result = label_encoder.inverse_transform([pred])[0]

    return jsonify({"result": result})


@app.route("/api/ndvi-map", methods=["GET"])
def ndvi_map():
    """
    Returns an Earth Engine tile layer descriptor (mapid/token) for NDVI,
    to be used from Leaflet as a raster overlay.
    """
    try:
        lat = float(request.args["lat"])
        lon = float(request.args["lon"])
        year = int(request.args.get("year", 2021))
        month = int(request.args.get("month", 8))
    except Exception as e:
        return jsonify({"error": f"Invalid parameters: {e}"}), 400

    if month < 1 or month > 12:
        return jsonify({"error": "month must be between 1 and 12"}), 400

    ndvi = get_ndvi_image(lat, lon, year, month)
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

    # Leaflet URL template for EE tiles (mapid/token style)
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
            "center": {"lat": lat, "lon": lon},
            "bufferMeters": 2000,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)