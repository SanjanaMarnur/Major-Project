import numpy as np
import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedShuffleSplit, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.ensemble import RandomForestClassifier
import joblib

# Load dataset
crop_dataset = pd.read_csv("data/crop_dataset.csv")

# Features (important order)
X = crop_dataset[
    ["June", "July", "Aug", "Sept", "Oct", "Growth_rate", "NDVI_range"]
]

# Target
y = crop_dataset["Crop_health"]

# Encode labels
labels = LabelEncoder()
y_encoded = labels.fit_transform(y)

# Train-test split using stratification
shuffle = StratifiedShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
for train_index, test_index in shuffle.split(X, y_encoded):
    X_train = X.iloc[train_index]
    X_test = X.iloc[test_index]
    y_train = y_encoded[train_index]
    y_test = y_encoded[test_index]

# Initialize model
rf_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

# Cross-validation
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
rf_scores = cross_val_score(
    rf_model,
    X_train,
    y_train,
    cv=skf,
    scoring="accuracy"
)

print("Cross-validation scores:", rf_scores)
print("Mean CV accuracy:", rf_scores.mean())

# Train model
rf_model.fit(X_train, y_train)

# Evaluate on test set
y_pred = rf_model.predict(X_test)

print("\nTest Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))
print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))

# Save trained model
os.makedirs("model", exist_ok=True)

joblib.dump(rf_model, "model/crop_health_model.pkl")
joblib.dump(labels, "model/label_encoder.pkl")

print("\nModel and Label Encoder saved successfully")