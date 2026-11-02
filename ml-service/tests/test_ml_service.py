"""
AgriConnect AI — Unit & Integration Tests for ML Service
"""

import sys
import os
import unittest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from app.decision_engine import (
    evaluate_post_harvest_decisions,
    rank_warehouses_engine,
    rank_transporters_engine,
    match_biomass_buyers_engine
)

class TestMLService(unittest.TestCase):
    def test_post_harvest_decisions(self):
        res = evaluate_post_harvest_decisions(
            crop_type="Basmati Rice",
            quantity_kg=4200.0,
            current_local_price_qtl=2840.0,
            forecast_price_qtl=3320.0,
            holding_days=21
        )
        self.assertIn("recommended_option", res)
        self.assertIn("options", res)
        self.assertEqual(len(res["options"]), 4)
        self.assertIsNotNone(res["circular_biomass_opportunity"])
        print("\nDecision evaluation test PASSED. Recommended:", res["recommended_option"])

    def test_warehouse_ranking(self):
        sample_whs = [
            {"warehouse_id": "WHS001", "warehouse_name": "Cold Hub", "district": "Karnal", "state": "Haryana", "available_capacity_kg": 50000, "rate_inr_per_kg_per_day": 0.05, "temperature_controlled": True},
            {"warehouse_id": "WHS002", "warehouse_name": "Far Storage", "district": "Ambala", "state": "Haryana", "available_capacity_kg": 2000, "rate_inr_per_kg_per_day": 0.12, "temperature_controlled": False}
        ]
        ranked = rank_warehouses_engine("Paddy", 4000.0, "Haryana", "Karnal", sample_whs)
        self.assertEqual(len(ranked), 2)
        self.assertEqual(ranked[0]["warehouse_id"], "WHS001")
        print("Warehouse ranking test PASSED.")

    def test_transporter_ranking(self):
        sample_trs = [
            {"transport_id": "TRN001", "provider_name": "Fast Fleet", "vehicle_type": "10-Ton Truck", "capacity_kg": 10000, "rate_inr_per_km": 35.0, "base_fee_inr": 400.0, "refrigerated": True},
            {"transport_id": "TRN002", "provider_name": "Mini Van", "vehicle_type": "Pickup", "capacity_kg": 1500, "rate_inr_per_km": 25.0, "base_fee_inr": 300.0, "refrigerated": False}
        ]
        ranked = rank_transporters_engine(4000.0, 50.0, "Haryana", "Karnal", sample_trs, perishable=True)
        self.assertEqual(ranked[0]["transport_id"], "TRN001")
        print("Transporter ranking test PASSED.")

if __name__ == "__main__":
    unittest.main()
