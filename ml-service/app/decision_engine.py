"""
AgriConnect AI — Decision Intelligence Engine
Module: ml-service/app/decision_engine.py
Purpose: Multi-factor post-harvest optimization, warehouse ranking, transporter selection, and biomass matching.
"""

import math
from typing import List, Dict, Any, Optional

def evaluate_post_harvest_decisions(
    crop_type: str,
    quantity_kg: float,
    current_local_price_qtl: float,
    forecast_price_qtl: Optional[float] = None,
    holding_days: int = 21,
    variety: str = "Standard",
    moisture_pct: float = 14.0,
    quality_grade: str = "Grade A"
) -> Dict[str, Any]:
    quintals = quantity_kg / 100.0

    # 1. Option: Sell Immediately
    immediate_gross = quintals * current_local_price_qtl
    local_mandi_fee = round(immediate_gross * 0.015, 2)  # 1.5% local mandi handling/cess
    immediate_net = round(immediate_gross - local_mandi_fee, 2)

    # 2. Option: Store then Sell
    # If no forecast provided, estimate a reasonable seasonal window
    future_price_qtl = forecast_price_qtl if forecast_price_qtl and forecast_price_qtl > 0 else round(current_local_price_qtl * 1.12, 2)
    # Storage weight loss factor (0.8% - 1.5% depending on moisture and storage quality)
    moisture_loss_rate = 0.012 if moisture_pct > 15 else 0.008
    effective_quintals = quintals * (1.0 - moisture_loss_rate)
    storage_gross = round(effective_quintals * future_price_qtl, 2)
    
    # Storage cost: Average INR 0.08 per kg per day
    avg_storage_rate_kg_day = 0.08
    storage_cost = round(quantity_kg * avg_storage_rate_kg_day * holding_days, 2)
    transport_to_wh = round(1200.0 + (quantity_kg * 0.35), 2)  # Short haul transport to local warehouse
    storage_handling = round(storage_gross * 0.02, 2)
    storage_net = round(storage_gross - storage_cost - transport_to_wh - storage_handling, 2)
    storage_upside = round(storage_net - immediate_net, 2)

    # 3. Option: Alternate Regional Market
    # Regional major APMC mandi offering 10% premium
    alt_price_qtl = round(current_local_price_qtl * 1.10, 2)
    alt_gross = round(quintals * alt_price_qtl, 2)
    long_distance_transport = round(2800.0 + (quantity_kg * 0.85), 2)
    alt_commission = round(alt_gross * 0.025, 2)
    alt_net = round(alt_gross - long_distance_transport - alt_commission, 2)
    alt_upside = round(alt_net - immediate_net, 2)

    # 4. Option: Food Processing / Institutional Contract
    # Processing purchase rate (fixed premium for high grade)
    grade_multiplier = 1.08 if "A" in quality_grade.upper() else 1.02
    processing_price_qtl = round(current_local_price_qtl * grade_multiplier, 2)
    proc_gross = round(quintals * processing_price_qtl, 2)
    proc_transport = round(2200.0 + (quantity_kg * 0.60), 2)
    proc_fee = round(proc_gross * 0.01, 2)
    proc_net = round(proc_gross - proc_transport - proc_fee, 2)
    proc_upside = round(proc_net - immediate_net, 2)

    # Options collection
    options = [
        {
            "option_type": "sell_immediately",
            "title": "Sell Today at Local Mandi",
            "action_label": "Sell Immediately",
            "expected_gross_revenue_inr": round(immediate_gross, 2),
            "transport_cost_inr": 0.0,
            "storage_cost_inr": 0.0,
            "handling_and_commission_inr": local_mandi_fee,
            "processing_fee_inr": 0.0,
            "estimated_net_return_inr": immediate_net,
            "net_upside_vs_immediate_sale_inr": 0.0,
            "risk_level": "low",
            "confidence_score": 0.95,
            "rationale": f"Immediate liquidity at current mandi rate (INR {current_local_price_qtl:,.2f}/qtl) with zero storage loss.",
            "assumptions": ["Mandi operates today", "Payment settled same day"]
        },
        {
            "option_type": "store_then_sell",
            "title": f"Store for {holding_days} Days in Warehouse",
            "action_label": "Store Produce",
            "expected_gross_revenue_inr": storage_gross,
            "transport_cost_inr": transport_to_wh,
            "storage_cost_inr": storage_cost,
            "handling_and_commission_inr": storage_handling,
            "processing_fee_inr": 0.0,
            "estimated_net_return_inr": storage_net,
            "net_upside_vs_immediate_sale_inr": storage_upside,
            "risk_level": "medium",
            "confidence_score": 0.78,
            "rationale": f"Anticipated price appreciation to INR {future_price_qtl:,.2f}/qtl exceeds storage costs, providing net upside.",
            "assumptions": [f"Holding duration: {holding_days} days", f"Storage shrinkage/loss: {moisture_loss_rate*100:.1f}%"]
        },
        {
            "option_type": "alternate_market",
            "title": "Dispatch to High-Demand Regional Market",
            "action_label": "Ship to Regional Mandi",
            "expected_gross_revenue_inr": alt_gross,
            "transport_cost_inr": long_distance_transport,
            "storage_cost_inr": 0.0,
            "handling_and_commission_inr": alt_commission,
            "processing_fee_inr": 0.0,
            "estimated_net_return_inr": alt_net,
            "net_upside_vs_immediate_sale_inr": alt_upside,
            "risk_level": "medium",
            "confidence_score": 0.72,
            "rationale": f"Regional market quotes premium rates (INR {alt_price_qtl:,.2f}/qtl) justifying inter-district freight.",
            "assumptions": ["Road transit takes ~4-6 hours", "Prices remain stable during transit"]
        },
        {
            "option_type": "food_processing",
            "title": "Contract Sale to Certified Processor",
            "action_label": "Contract Processing",
            "expected_gross_revenue_inr": proc_gross,
            "transport_cost_inr": proc_transport,
            "storage_cost_inr": 0.0,
            "handling_and_commission_inr": 0.0,
            "processing_fee_inr": proc_fee,
            "estimated_net_return_inr": proc_net,
            "net_upside_vs_immediate_sale_inr": proc_upside,
            "risk_level": "low",
            "confidence_score": 0.82,
            "rationale": f"Guaranteed institutional procurement with fixed quality grade premium.",
            "assumptions": ["Moisture within processor limits", "Direct B2B transfer"]
        }
    ]

    # Rank options by net return
    options_sorted = sorted(options, key=lambda x: x["estimated_net_return_inr"], reverse=True)
    best_option = options_sorted[0]

    # Biomass Opportunity Add-on
    residue_map = {
        "Paddy": "Paddy Straw",
        "Rice": "Paddy Straw",
        "Basmati Rice": "Paddy Straw",
        "Cotton": "Cotton Stalks",
        "Sugarcane": "Sugarcane Bagasse",
        "Coconut": "Coconut Husk",
        "Banana": "Banana Stem",
        "Maize": "Maize Stalks",
        "Groundnut": "Groundnut Shells"
    }
    
    biomass_item = residue_map.get(crop_type)
    circular_opp = None
    if biomass_item:
        est_residue_kg = round(quantity_kg * 0.45, 2)
        avg_price_kg = 2.40
        est_value = round(est_residue_kg * avg_price_kg, 2)
        circular_opp = {
            "residue_type": biomass_item,
            "estimated_residue_kg": est_residue_kg,
            "potential_circular_revenue_inr": est_value,
            "benefit_description": f"Recycle {est_residue_kg} kg of {biomass_item} to bio-energy / paper mills instead of burning."
        }

    return {
        "recommended_option": best_option["option_type"],
        "top_net_upside_inr": best_option["net_upside_vs_immediate_sale_inr"],
        "overall_confidence": best_option["confidence_score"],
        "options": options_sorted,
        "circular_biomass_opportunity": circular_opp,
        "disclaimer": "All calculations are deterministic estimates grounded in current mandi benchmarks and declared tariffs. Market prices fluctuate."
    }

def rank_warehouses_engine(
    crop_type: str,
    quantity_kg: float,
    user_state: str,
    user_district: str,
    warehouses_list: List[Dict[str, Any]],
    holding_days: int = 30
) -> List[Dict[str, Any]]:
    ranked = []
    for wh in warehouses_list:
        cap = float(wh.get("capacity_kg", 50000))
        avail = float(wh.get("available_capacity_kg", 20000))
        rate_day = float(wh.get("rate_inr_per_kg_per_day", 0.08))
        wh_state = str(wh.get("state", "")).strip()
        wh_dist = str(wh.get("district", "")).strip()

        # Distance estimate: same district = 15km, same state = 45km, other = 120km
        dist_km = 15.0 if wh_dist.lower() == user_district.lower() else (45.0 if wh_state.lower() == user_state.lower() else 110.0)

        can_fit = avail >= quantity_kg
        utilization_pct = round(((cap - avail) / cap) * 100, 1) if cap > 0 else 0
        total_storage_cost = round(quantity_kg * rate_day * holding_days, 2)

        # Scoring: lower cost, closer distance, sufficient capacity
        score = 100.0 - (dist_km * 0.3) - (rate_day * 200)
        if not can_fit:
            score -= 40.0
        if wh.get("temperature_controlled", False):
            score += 10.0

        ranked.append({
            "warehouse_id": wh.get("warehouse_id") or wh.get("_id"),
            "warehouse_name": wh.get("warehouse_name", "Local Storage"),
            "storage_type": wh.get("storage_type", "Dry Warehouse"),
            "state": wh_state,
            "district": wh_dist,
            "estimated_distance_km": dist_km,
            "available_capacity_kg": avail,
            "capacity_fit": can_fit,
            "utilization_pct": utilization_pct,
            "rate_inr_per_kg_per_day": rate_day,
            "projected_cost_for_load_inr": total_storage_cost,
            "temperature_controlled": wh.get("temperature_controlled", False),
            "match_score": round(max(10.0, min(99.0, score)), 1)
        })

    return sorted(ranked, key=lambda x: x["match_score"], reverse=True)

def rank_transporters_engine(
    quantity_kg: float,
    distance_km: float,
    user_state: str,
    user_district: str,
    transporters_list: List[Dict[str, Any]],
    perishable: bool = False
) -> List[Dict[str, Any]]:
    ranked = []
    for tr in transporters_list:
        cap = float(tr.get("capacity_kg", 5000))
        rate_km = float(tr.get("rate_inr_per_km", 40.0))
        base_fee = float(tr.get("base_fee_inr", 500.0))
        is_ref = bool(tr.get("refrigerated", False))

        trips = math.ceil(quantity_kg / cap) if cap > 0 else 1
        total_fare = round(trips * (base_fee + (rate_km * distance_km)), 2)
        est_transit_hours = round(max(0.5, distance_km / 45.0), 1)

        # Scoring
        score = 100.0 - (rate_km * 0.5) - (trips * 10.0)
        if perishable and is_ref:
            score += 20.0
        elif perishable and not is_ref:
            score -= 15.0

        ranked.append({
            "transport_id": tr.get("transport_id") or tr.get("_id"),
            "provider_name": tr.get("provider_name", "Carrier"),
            "vehicle_type": tr.get("vehicle_type", "Truck"),
            "capacity_kg": cap,
            "trips_needed": trips,
            "rate_inr_per_km": rate_km,
            "base_fee_inr": base_fee,
            "estimated_total_fare_inr": total_fare,
            "estimated_duration_hours": est_transit_hours,
            "refrigerated": is_ref,
            "match_score": round(max(15.0, min(99.0, score)), 1)
        })

    return sorted(ranked, key=lambda x: x["match_score"], reverse=True)

def match_biomass_buyers_engine(
    residue_type: str,
    quantity_kg: float,
    asking_price_kg: float,
    user_state: str,
    user_district: str,
    buyers_list: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    matches = []
    for b in buyers_list:
        accepted_res = b.get("accepted_residues", [])
        if isinstance(accepted_res, str):
            accepted_res = [x.strip() for x in accepted_res.split(",")]

        # Case-insensitive substring match
        matched_res = any(residue_type.lower() in str(r).lower() or str(r).lower() in residue_type.lower() for r in accepted_res)
        if not matched_res and accepted_res:
            continue

        offer_price = float(b.get("offer_price_inr_per_kg", 2.0))
        req_qty = float(b.get("required_quantity_kg", 10000))
        b_state = str(b.get("state", "")).strip()
        b_dist = str(b.get("district", "")).strip()

        dist_km = 20.0 if b_dist.lower() == user_district.lower() else (65.0 if b_state.lower() == user_state.lower() else 140.0)
        price_spread = round(offer_price - asking_price_kg, 2)
        total_offer_value = round(quantity_kg * offer_price, 2)
        est_haul_cost = round(800.0 + (dist_km * 12.0), 2)
        net_farmer_return = round(total_offer_value - est_haul_cost, 2)

        match_score = 75.0 + (price_spread * 10.0) - (dist_km * 0.1)

        matches.append({
            "buyer_id": b.get("buyer_id") or b.get("_id"),
            "company_name": b.get("company_name", "Agro Industries"),
            "buyer_category": b.get("buyer_category", "Biomass Processor"),
            "state": b_state,
            "district": b_dist,
            "estimated_distance_km": dist_km,
            "offered_price_inr_per_kg": offer_price,
            "asking_price_inr_per_kg": asking_price_kg,
            "price_spread_inr": price_spread,
            "gross_order_value_inr": total_offer_value,
            "estimated_transport_cost_inr": est_haul_cost,
            "estimated_net_return_inr": net_farmer_return,
            "demand_fill_pct": round(min(100.0, (quantity_kg / req_qty) * 100), 1) if req_qty > 0 else 100.0,
            "match_score": round(max(20.0, min(99.0, match_score)), 1)
        })

    return sorted(matches, key=lambda x: x["match_score"], reverse=True)
