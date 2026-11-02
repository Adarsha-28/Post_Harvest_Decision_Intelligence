from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class MarketPricePredictRequest(BaseModel):
    crop_type: str = Field(..., example="Basmati Rice")
    state: str = Field(..., example="Haryana")
    district: str = Field(..., example="Karnal")
    market_name: Optional[str] = Field(None, example="Karnal APMC")
    current_modal_price: Optional[float] = Field(None, example=2840.0)
    min_price: Optional[float] = Field(None, example=2600.0)
    max_price: Optional[float] = Field(None, example=3100.0)
    horizon_days: int = Field(30, ge=1, le=180, example=30)

class MarketPricePredictResponse(BaseModel):
    crop_type: str
    state: str
    district: str
    market_name: Optional[str] = None
    current_price_inr_per_quintal: Optional[float]
    current_min_price_inr_per_quintal: Optional[float] = None
    current_max_price_inr_per_quintal: Optional[float] = None
    predicted_modal_price_inr_per_quintal: float
    predicted_min_price_inr_per_quintal: float
    predicted_max_price_inr_per_quintal: float
    forecast_price_inr_per_quintal: Optional[float] = None
    expected_gain_inr_per_quintal: float
    price_change_pct: float
    forecast_horizon_days: int
    confidence_score: float
    model_version: str
    is_demo_synthetic: bool
    data_classification: str

class DecisionRequest(BaseModel):
    harvest_id: Optional[str] = "HAR_DEMO"
    crop_type: str = Field(..., example="Basmati Rice")
    variety: Optional[str] = "Pusa 1121"
    quantity_kg: float = Field(..., gt=0, example=4200.0)
    quality_grade: Optional[str] = "Grade A"
    moisture_pct: Optional[float] = 14.0
    current_local_price_inr_per_quintal: float = Field(..., gt=0, example=2840.0)
    forecast_price_inr_per_quintal: Optional[float] = None
    state: str = "Haryana"
    district: str = "Karnal"
    holding_days_intended: int = 21

class DecisionOption(BaseModel):
    option_type: str
    title: str
    action_label: str
    expected_gross_revenue_inr: float
    transport_cost_inr: float
    storage_cost_inr: float
    handling_and_commission_inr: float
    processing_fee_inr: float
    estimated_net_return_inr: float
    net_upside_vs_immediate_sale_inr: float
    risk_level: str
    confidence_score: float
    rationale: str
    assumptions: List[str]

class DecisionResponse(BaseModel):
    harvest_id: str
    crop_type: str
    quantity_kg: float
    recommended_option: str
    top_net_upside_inr: float
    overall_confidence: float
    options: List[DecisionOption]
    circular_biomass_opportunity: Optional[Dict[str, Any]] = None
    disclaimer: str

class WarehouseRankRequest(BaseModel):
    crop_type: str
    quantity_kg: float
    state: str
    district: str
    max_distance_km: Optional[float] = 100.0
    warehouses: Optional[List[Dict[str, Any]]] = None

class TransportRankRequest(BaseModel):
    quantity_kg: float
    distance_km: float
    state: str
    district: str
    perishable: Optional[bool] = False
    transporters: Optional[List[Dict[str, Any]]] = None

class BiomassMatchRequest(BaseModel):
    residue_type: str
    quantity_kg: float
    asking_price_inr_per_kg: float
    state: str
    district: str
    buyers: Optional[List[Dict[str, Any]]] = None
