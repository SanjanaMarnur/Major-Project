import numpy as np
import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedShuffleSplit, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.ensemble import RandomForestClassifier
import joblib

crop_dataset = pd.read_csv("crop_dataset.csv")

X = crop_dataset[[
    "June",
    "July",
    "Aug",
    "Sept",
    "Oct",
    "Growth_rate",
    "NDVI_range"
]]

y = crop_dataset["Crop_health"]

labels = LabelEncoder()
y_encoded = labels.fit_transform(y)

shuffle = StratifiedShuffleSplit(n_splits=1, test_size= 0.2, random_state= 42)
for train_index, test_index in shuffle.split(X, y_encoded):
    X_train = X.iloc[train_index]
    X_test = X.iloc[test_index]
    y_train = y_encoded[train_index]
    y_test = y_encoded[test_index]

rf_model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
rf_scores = cross_val_score(
    rf_model,
    X_train,
    y_train,
    cv=skf,
    scoring="accuracy"
)

joblib.dump(rf_model, "crop_health_model.pkl")
joblib.dump(labels, "label_encoder.pkl")

# print("Cross-validation scores:", rf_scores)
# print("Mean CV accuracy:", rf_scores.mean())
# rf_model.fit(X_train, y_train)
# test_accuracy = rf_model.score(X_test, y_test)
# print("Test accuracy:", test_accuracy)
