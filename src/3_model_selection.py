import numpy as np
import pandas as pd
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedShuffleSplit, StratifiedKFold, cross_val_score
from sklearn.tree import DecisionTreeClassifier 
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.ensemble import RandomForestClassifier

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
# print(X.shape)
# print(y.shape)

labels = LabelEncoder()
y_encoded = labels.fit_transform(y)
# print(dict(zip(labels.classes_, labels.transform(labels.classes_))))

shuffle = StratifiedShuffleSplit(n_splits=1, test_size= 0.2, random_state= 42)
for train_index, test_index in shuffle.split(X, y_encoded):
    X_train = X.iloc[train_index]
    X_test = X.iloc[test_index]
    y_train = y_encoded[train_index]
    y_test = y_encoded[test_index]
# print("Train distribution:\n", pd.Series(y_train).value_counts(normalize=True))
# print("\nTest distribution:\n", pd.Series(y_test).value_counts(normalize=True))

model = DecisionTreeClassifier(random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
print("Decision Tree Accuracy:", accuracy_score(y_test, y_pred))
print(classification_report(y_test, y_pred))


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
print("Cross-validation scores:", rf_scores)
print("Mean CV accuracy:", rf_scores.mean())
rf_model.fit(X_train, y_train)
test_accuracy = rf_model.score(X_test, y_test)
print("Test accuracy:", test_accuracy)


from xgboost import XGBClassifier

# Model
xgb_model = XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=4,
    random_state=42,
    eval_metric='mlogloss'
)

# Train
xgb_model.fit(X_train, y_train)

# Predict
y_pred_xgb = xgb_model.predict(X_test)

# Evaluation
print("XGBoost Accuracy:", accuracy_score(y_test, y_pred_xgb))
print(classification_report(y_test, y_pred_xgb))

# Cross-validation
xgb_scores = cross_val_score(
    xgb_model,
    X_train,
    y_train,
    cv=skf,
    scoring="accuracy"
)

print("XGB CV scores:", xgb_scores)
print("Mean CV accuracy:", xgb_scores.mean())

