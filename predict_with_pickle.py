import argparse
import importlib
import json
import subprocess
import sys
from pathlib import Path

def ensure_package(import_name: str, pip_name: str):
    try:
        return importlib.import_module(import_name)
    except ModuleNotFoundError:
        # Install missing dependency in the same interpreter used by this script.
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", pip_name],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return importlib.import_module(import_name)


np = ensure_package("numpy", "numpy")
joblib = ensure_package("joblib", "joblib")
# Needed when loading sklearn-based pickle models.
ensure_package("sklearn", "scikit-learn")
pd = ensure_package("pandas", "pandas")

from sklearn.exceptions import NotFittedError


def parse_args():
    parser = argparse.ArgumentParser(description="Predict crop health using pickle model")
    parser.add_argument("--model-path", required=True, help="Path to crop_health_model.pkl")
    parser.add_argument("--encoder-path", required=False, help="Path to label_encoder.pkl")
    parser.add_argument("--dataset-path", required=False, help="Path to crop_dataset.csv used for retraining if model is not fitted")
    parser.add_argument("--june", type=float, required=True)
    parser.add_argument("--july", type=float, required=True)
    parser.add_argument("--aug", type=float, required=True)
    parser.add_argument("--sept", type=float, required=True)
    parser.add_argument("--oct", type=float, required=True)
    parser.add_argument("--growth-rate", type=float, required=True)
    parser.add_argument("--ndvi-range", type=float, required=True)
    return parser.parse_args()


def fit_and_persist_model_if_needed(model, encoder, args):
    dataset_path = Path(args.dataset_path) if args.dataset_path else None
    if dataset_path is None or not dataset_path.exists():
        raise NotFittedError(
            "Loaded pickle model is not fitted and dataset path was not provided/found for retraining."
        )

    crop_dataset = pd.read_csv(dataset_path)
    feature_cols = ["June", "July", "Aug", "Sept", "Oct", "Growth_rate", "NDVI_range"]
    X = crop_dataset[feature_cols]
    y = crop_dataset["Crop_health"]

    # If an encoder exists and exposes classes, encode labels to match training style.
    if encoder is not None and hasattr(encoder, "fit_transform"):
        y_train = encoder.fit_transform(y)
    else:
        y_train = y

    model.fit(X, y_train)
    joblib.dump(model, args.model_path)
    if encoder is not None and args.encoder_path:
        joblib.dump(encoder, args.encoder_path)
    return model, encoder


def main():
    args = parse_args()
    model_path = Path(args.model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    model = joblib.load(model_path)
    encoder = None

    if args.encoder_path:
        encoder_path = Path(args.encoder_path)
        if encoder_path.exists():
            encoder = joblib.load(encoder_path)

    features = np.array(
        [[args.june, args.july, args.aug, args.sept, args.oct, args.growth_rate, args.ndvi_range]],
        dtype=float,
    )

    try:
        pred = model.predict(features)[0]
    except NotFittedError:
        model, encoder = fit_and_persist_model_if_needed(model, encoder, args)
        pred = model.predict(features)[0]

    if isinstance(pred, (np.integer, int)) and encoder is not None:
        label = str(encoder.inverse_transform([int(pred)])[0])
    else:
        label = str(pred)

    confidence = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(features)[0]
        confidence = float(np.max(proba) * 100.0)

    print(json.dumps({"prediction": label, "confidence": confidence}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Keep machine-readable JSON on stdout for caller robustness.
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
