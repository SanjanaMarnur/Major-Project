import ee
import joblib
import numpy as np

# 🔥 Initialize Earth Engine
ee.Initialize(project='seventh-sunbeam-387910')


# 🔥 NDVI EXTRACTION FUNCTION
def get_ndvi_timeseries(lat, lon, year, current_month):

    geometry = ee.Geometry.Point([lon, lat]).buffer(2000)

    # ✅ Updated dataset (FIXED)
    collection = ee.ImageCollection("COPERNICUS/S2_HARMONIZED") \
        .filterBounds(geometry) \
        .filterDate(f"{year}-06-01", f"{year}-10-31") \
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40))

    def add_ndvi(image):
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return image.addBands(ndvi)

    ndvi_collection = collection.map(add_ndvi)

    months_map = {
        6: "06", 7: "07", 8: "08", 9: "09", 10: "10"
    }

    ndvi_values = []

    # 🔥 Get NDVI till current month
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

        # ✅ Safe extraction
        try:
            ndvi = value.getInfo()
            if ndvi is None:
                ndvi = 0
        except:
            ndvi = 0

        ndvi_values.append(ndvi)

    # ✅ Edge case fix
    if len(ndvi_values) == 0:
        ndvi_values = [0]

    # 🔥 Fill remaining months
    while len(ndvi_values) < 5:
        ndvi_values.append(ndvi_values[-1])

    return ndvi_values


# 🔥 FEATURE ENGINEERING
def create_features(ndvi_values):
    june, july, aug, sept, octo = ndvi_values

    growth_rate = sept - june
    ndvi_range = max(ndvi_values) - min(ndvi_values)

    return [june, july, aug, sept, octo, growth_rate, ndvi_range]


# 🔥 LOAD TRAINED MODEL + LABEL ENCODER
model = joblib.load("model/crop_health_model.pkl")
label_encoder = joblib.load("model/label_encoder.pkl")


# 🔥 PREDICTION FUNCTION
def predict_crop_health(features):
    features = np.array(features).reshape(1, -1)

    pred = model.predict(features)[0]

    # ✅ Convert numeric → label
    label = label_encoder.inverse_transform([pred])[0]

    return label


# 🔥 FULL PIPELINE
def run_prediction(lat, lon, year, current_month):

    ndvi_values = get_ndvi_timeseries(lat, lon, year, current_month)

    features = create_features(ndvi_values)

    prediction = predict_crop_health(features)

    return prediction


# 🔥 TEST RUN
if __name__ == "__main__":
    result = run_prediction(16.20, 77.37, 2021, 8)  # August
    print("Crop Health:", result)