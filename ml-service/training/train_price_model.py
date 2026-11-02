"""
AgriConnect AI — Machine Learning Pipeline
Script: ml-service/training/train_price_model.py
Purpose: Train, evaluate, and persist scikit-learn price forecasting models.
Artifacts:
  - ml-service/models/price_forecaster.joblib
  - ml-service/models/model_metadata.json
"""

import os
import sys
import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
SYNTHETIC_CSV = os.path.join(PROJECT_ROOT, "data", "cleaned", "market_prices.csv")
REAL_CSV = os.path.join(PROJECT_ROOT, "data", "cleaned", "real_market_prices.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_model():
    print("=" * 65)
    print("AgriConnect AI — Training Agricultural Price Forecasting Model")
    print("=" * 65)

    dfs = []
    if os.path.exists(SYNTHETIC_CSV):
        df_syn = pd.read_csv(SYNTHETIC_CSV)
        df_syn["is_synthetic"] = True
        dfs.append(df_syn)
        print(f"Loaded {len(df_syn)} synthetic records.")

    if os.path.exists(REAL_CSV):
        df_real = pd.read_csv(REAL_CSV)
        df_real["is_synthetic"] = False
        dfs.append(df_real)
        print(f"Loaded {len(df_real)} real APMC mandi records.")

    if not dfs:
        raise FileNotFoundError("No market price datasets found for training!")

    data = pd.concat(dfs, ignore_index=True)
    print(f"Total dataset size: {len(data)} rows.")

    # Parse and sort chronologically to ensure time-ordered split
    data["date"] = pd.to_datetime(data["price_date"], errors="coerce")
    data = data.dropna(subset=["date", "modal_price_inr_per_quintal"])
    data = data.sort_values("date").reset_index(drop=True)

    # Feature Engineering
    data["month"] = data["date"].dt.month
    data["day_of_week"] = data["date"].dt.dayofweek
    data["day_of_year"] = data["date"].dt.dayofyear
    data["quarter"] = data["date"].dt.quarter

    # Standardize names
    data["crop_type"] = data["crop_type"].astype(str).str.strip().str.title()
    data["state"] = data["state"].astype(str).str.strip()
    data["district"] = data["district"].astype(str).str.strip()

    categorical_features = ["crop_type", "state", "district"]
    numerical_features = ["month", "day_of_week", "day_of_year", "quarter", "min_price_inr_per_quintal", "max_price_inr_per_quintal"]

    X = data[categorical_features + numerical_features]
    y = data["modal_price_inr_per_quintal"].values

    # Time-ordered split (80% train, 20% test) to prevent future data leakage
    split_idx = int(len(data) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"Train samples (earlier dates): {len(X_train)} | Test samples (later dates): {len(X_test)}")

    # Preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
            ("num", StandardScaler(), numerical_features)
        ]
    )

    # Regressor Pipeline
    regressor = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_depth=8,
        random_state=42
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("regressor", regressor)
    ])

    print("\nFitting regression pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate Model
    y_pred = pipeline.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    # Evaluate Baseline (Historical median per crop in training set)
    crop_medians = X_train.assign(target=y_train).groupby("crop_type")["target"].median().to_dict()
    global_median = float(np.median(y_train))
    baseline_pred = [crop_medians.get(crop, global_median) for crop in X_test["crop_type"]]
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))

    print("\n" + "=" * 45)
    print("EVALUATION RESULTS (vs. Baseline)")
    print("=" * 45)
    print(f"Model MAE:      INR {mae:,.2f} / quintal  (Baseline: INR {baseline_mae:,.2f})")
    print(f"Model RMSE:     INR {rmse:,.2f} / quintal  (Baseline: INR {baseline_rmse:,.2f})")
    print(f"Model R2:       {r2:.4f}")
    improvement_pct = ((baseline_mae - mae) / baseline_mae) * 100
    print(f"Accuracy Gain over Baseline: +{improvement_pct:.2f}%")

    # Persist Pipeline Artifact
    artifact_path = os.path.join(MODELS_DIR, "price_forecaster.joblib")
    joblib.dump(pipeline, artifact_path)
    print(f"\nModel pipeline saved to: {artifact_path}")

    # Unique commodities and locations for validation
    unique_crops = sorted(list(data["crop_type"].unique()))
    unique_states = sorted(list(data["state"].unique()))

    metadata = {
        "model_name": "AgriConnect AI Agricultural Price Forecaster",
        "algorithm": "HistGradientBoostingRegressor",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_composition": {
            "total_samples": len(data),
            "synthetic_demo_samples": int((data["is_synthetic"] == True).sum()),
            "real_apmc_samples": int((data["is_synthetic"] == False).sum()),
            "data_notice": "Trained on both synthetic demo time-series and verified real APMC market observations. Demo predictions must be labeled as illustrative."
        },
        "evaluation_metrics": {
            "test_mae_inr_per_quintal": round(mae, 2),
            "test_rmse_inr_per_quintal": round(rmse, 2),
            "test_r2_score": round(r2, 4),
            "baseline_mae_inr_per_quintal": round(baseline_mae, 2),
            "improvement_over_baseline_pct": round(improvement_pct, 2)
        },
        "features": {
            "categorical": categorical_features,
            "numerical": numerical_features
        },
        "supported_crops_count": len(unique_crops),
        "supported_crops_sample": unique_crops[:15]
    }

    meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to: {meta_path}")

    # Sanity check inference
    sample_input = pd.DataFrame([{
        "crop_type": "Basmati Rice",
        "state": "Haryana",
        "district": "Karnal",
        "month": 10,
        "day_of_week": 6,
        "day_of_year": 292,
        "quarter": 4,
        "min_price_inr_per_quintal": 2800.0,
        "max_price_inr_per_quintal": 3600.0
    }])
    sample_pred = pipeline.predict(sample_input)[0]
    print(f"\nInference Sanity Check: Basmati Rice in Karnal (Oct) -> Predicted: INR {sample_pred:,.2f} / quintal")
    print("Training pipeline successfully finished!")

if __name__ == "__main__":
    train_model()
