"""
AgriConnect AI — Python Machine Learning Service
FastAPI Microservice (Port 8000)
"""

import os
import sys
import json
import joblib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

from .schemas import (
    MarketPricePredictRequest,
    MarketPricePredictResponse,
    DecisionRequest,
    DecisionResponse,
    WarehouseRankRequest,
    TransportRankRequest,
    BiomassMatchRequest
)
from .decision_engine import (
    evaluate_post_harvest_decisions,
    rank_warehouses_engine,
    rank_transporters_engine,
    match_biomass_buyers_engine
)

APP_DIR = os.path.dirname(__file__)
BASE_DIR = os.path.abspath(os.path.join(APP_DIR, ".."))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "price_forecaster.joblib")
META_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

app = FastAPI(
    title="AgriConnect AI Machine Learning Service",
    description="Agricultural Price Forecasting and Post-Harvest Decision Intelligence Engine",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

price_pipeline = None
model_meta = {}

@app.on_event("startup")
def load_artifacts():
    global price_pipeline, model_meta
    if os.path.exists(MODEL_PATH):
        try:
            price_pipeline = joblib.load(MODEL_PATH)
            print(f"[ML Service] Successfully loaded price forecaster artifact from {MODEL_PATH}")
        except Exception as e:
            print(f"[ML Service] Error loading pipeline: {e}")
    else:
        print(f"[ML Service] Warning: Model artifact not found at {MODEL_PATH}")

    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, "r", encoding="utf-8") as f:
                model_meta = json.load(f)
        except Exception as e:
            print(f"[ML Service] Error reading metadata: {e}")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AgriConnect AI Python ML Service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_loaded": price_pipeline is not None,
        "algorithm": model_meta.get("algorithm", "HistGradientBoostingRegressor")
    }

@app.get("/models/status")
def models_status():
    return {
        "price_forecasting_model": {
            "status": "loaded" if price_pipeline is not None else "unavailable",
            "model_name": model_meta.get("model_name", "Price Forecaster"),
            "algorithm": model_meta.get("algorithm", "HistGradientBoostingRegressor"),
            "trained_at": model_meta.get("trained_at"),
            "dataset_composition": model_meta.get("dataset_composition", {}),
            "evaluation_metrics": model_meta.get("evaluation_metrics", {})
        },
        "decision_intelligence_engine": {
            "status": "active",
            "mode": "multi_factor_deterministic_decision_engine",
            "capabilities": ["sell_now", "store_sell_later", "alternate_market", "processing", "biomass_circular"]
        }
    }

@app.post("/predict/market-price", response_model=MarketPricePredictResponse)
def predict_market_price(req: MarketPricePredictRequest):
    target_date = datetime.now(timezone.utc) + timedelta(days=req.horizon_days)
    
    crop = req.crop_type.strip().title()
    state = req.state.strip()
    district = req.district.strip()

    # Min/max defaults based on current or standard spread
    curr_modal = req.current_modal_price if req.current_modal_price and req.current_modal_price > 0 else 2800.0
    min_p = req.min_price if req.min_price and req.min_price > 0 else round(curr_modal * 0.90, 2)
    max_p = req.max_price if req.max_price and req.max_price > 0 else round(curr_modal * 1.15, 2)

    predicted_price = curr_modal

    if price_pipeline is not None:
        try:
            feat_df = pd.DataFrame([{
                "crop_type": crop,
                "state": state,
                "district": district,
                "month": target_date.month,
                "day_of_week": target_date.weekday(),
                "day_of_year": target_date.timetuple().tm_yday,
                "quarter": (target_date.month - 1) // 3 + 1,
                "min_price_inr_per_quintal": min_p,
                "max_price_inr_per_quintal": max_p
            }])
            raw_pred = float(price_pipeline.predict(feat_df)[0])
            # Bound prediction to plausible domain
            predicted_price = round(max(min_p * 0.8, min(max_p * 1.3, raw_pred)), 2)
        except Exception as e:
            print(f"[ML Prediction Error] {e}; using baseline heuristic")
            predicted_price = round(curr_modal * (1.0 + (0.003 * req.horizon_days)), 2)
    else:
        # Heuristic fallback if pipeline unmounted
        predicted_price = round(curr_modal * 1.08, 2)

    change_pct = round(((predicted_price - curr_modal) / curr_modal) * 100, 2)
    expected_gain = round(predicted_price - curr_modal, 2)
    
    # Calculate predicted price band (min, modal, max)
    ratio_min = (min_p / curr_modal) if curr_modal > 0 else 0.91
    ratio_max = (max_p / curr_modal) if curr_modal > 0 else 1.13
    pred_min = round(predicted_price * min(0.96, max(0.80, ratio_min)), 2)
    pred_max = round(predicted_price * max(1.04, min(1.25, ratio_max)), 2)

    # Confidence score based on horizon
    conf = round(max(0.60, 0.88 - (req.horizon_days * 0.0015)), 2)

    return MarketPricePredictResponse(
        crop_type=crop,
        state=state,
        district=district,
        market_name=req.market_name or f"{district} APMC Mandi",
        current_price_inr_per_quintal=curr_modal,
        current_min_price_inr_per_quintal=min_p,
        current_max_price_inr_per_quintal=max_p,
        predicted_modal_price_inr_per_quintal=predicted_price,
        predicted_min_price_inr_per_quintal=pred_min,
        predicted_max_price_inr_per_quintal=pred_max,
        forecast_price_inr_per_quintal=predicted_price,
        expected_gain_inr_per_quintal=expected_gain,
        price_change_pct=change_pct,
        forecast_horizon_days=req.horizon_days,
        confidence_score=conf,
        model_version="v1.0.0-HistGradientBoosting",
        is_demo_synthetic=True,
        data_classification="DEMO / TRAINED ON SYNTHETIC AND APMC DATA"
    )

@app.post("/recommendations/post-harvest", response_model=DecisionResponse)
def get_post_harvest_recommendation(req: DecisionRequest):
    # Predict future price if not supplied
    future_price = req.forecast_price_inr_per_quintal
    if not future_price or future_price <= 0:
        pred_res = predict_market_price(MarketPricePredictRequest(
            crop_type=req.crop_type,
            state=req.state,
            district=req.district,
            current_modal_price=req.current_local_price_inr_per_quintal,
            horizon_days=req.holding_days_intended
        ))
        future_price = pred_res.predicted_modal_price_inr_per_quintal

    eval_result = evaluate_post_harvest_decisions(
        crop_type=req.crop_type,
        quantity_kg=req.quantity_kg,
        current_local_price_qtl=req.current_local_price_inr_per_quintal,
        forecast_price_qtl=future_price,
        holding_days=req.holding_days_intended,
        variety=req.variety or "Standard",
        moisture_pct=req.moisture_pct or 14.0,
        quality_grade=req.quality_grade or "Grade A"
    )

    return DecisionResponse(
        harvest_id=req.harvest_id or "HAR_CUSTOM",
        crop_type=req.crop_type,
        quantity_kg=req.quantity_kg,
        recommended_option=eval_result["recommended_option"],
        top_net_upside_inr=eval_result["top_net_upside_inr"],
        overall_confidence=eval_result["overall_confidence"],
        options=eval_result["options"],
        circular_biomass_opportunity=eval_result["circular_biomass_opportunity"],
        disclaimer=eval_result["disclaimer"]
    )

@app.post("/recommendations/warehouse")
def rank_warehouses_api(req: WarehouseRankRequest):
    wh_list = req.warehouses or []
    ranked = rank_warehouses_engine(
        crop_type=req.crop_type,
        quantity_kg=req.quantity_kg,
        user_state=req.state,
        user_district=req.district,
        warehouses_list=wh_list
    )
    return {
        "status": "success",
        "crop_type": req.crop_type,
        "quantity_kg": req.quantity_kg,
        "total_warehouses_evaluated": len(wh_list),
        "ranked_warehouses": ranked
    }

@app.post("/recommendations/transport")
def rank_transporters_api(req: TransportRankRequest):
    tr_list = req.transporters or []
    ranked = rank_transporters_engine(
        quantity_kg=req.quantity_kg,
        distance_km=req.distance_km,
        user_state=req.state,
        user_district=req.district,
        transporters_list=tr_list,
        perishable=req.perishable or False
    )
    return {
        "status": "success",
        "quantity_kg": req.quantity_kg,
        "distance_km": req.distance_km,
        "total_transporters_evaluated": len(tr_list),
        "ranked_transporters": ranked
    }

@app.post("/recommendations/biomass")
def match_biomass_api(req: BiomassMatchRequest):
    by_list = req.buyers or []
    matches = match_biomass_buyers_engine(
        residue_type=req.residue_type,
        quantity_kg=req.quantity_kg,
        asking_price_kg=req.asking_price_inr_per_kg,
        user_state=req.state,
        user_district=req.district,
        buyers_list=by_list
    )
    return {
        "status": "success",
        "residue_type": req.residue_type,
        "quantity_kg": req.quantity_kg,
        "total_buyers_evaluated": len(by_list),
        "matched_buyers": matches
    }
