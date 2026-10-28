import { env } from '../config/env.js';

export class MLClient {
  constructor(baseUrl = env.mlServiceUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchApi(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) {
        throw new Error(`ML Service responded with HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`[ML Client Warning] ${path} call failed (${error.message}). Using fallback engine.`);
      return null;
    }
  }

  async getHealth() {
    return await this.fetchApi('/health');
  }

  async predictPrice(cropType, state, district, currentModalPrice, horizonDays = 30, minPrice = null, maxPrice = null, marketName = null) {
    const payload = {
      crop_type: cropType,
      state: state || 'Haryana',
      district: district || 'Karnal',
      market_name: marketName,
      current_modal_price: currentModalPrice,
      min_price: minPrice,
      max_price: maxPrice,
      horizon_days: horizonDays
    };
    const res = await this.fetchApi('/predict/market-price', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res) return res;

    // Fallback baseline heuristic if service unreachable
    const currModal = currentModalPrice || 2840;
    const currMin = minPrice || Math.round(currModal * 0.92);
    const currMax = maxPrice || Math.round(currModal * 1.13);
    const fallbackPred = Math.round(currModal * (1 + 0.08 * (horizonDays / 30)));
    const predMin = Math.round(fallbackPred * 0.92);
    const predMax = Math.round(fallbackPred * 1.13);
    const gain = fallbackPred - currModal;
    const changePct = Math.round(((fallbackPred - currModal) / currModal) * 1000) / 10;

    return {
      crop_type: cropType,
      state: state || 'Haryana',
      district: district || 'Karnal',
      market_name: marketName || `${district || 'Karnal'} APMC Mandi`,
      current_price_inr_per_quintal: currModal,
      current_min_price_inr_per_quintal: currMin,
      current_max_price_inr_per_quintal: currMax,
      predicted_modal_price_inr_per_quintal: fallbackPred,
      predicted_min_price_inr_per_quintal: predMin,
      predicted_max_price_inr_per_quintal: predMax,
      forecast_price_inr_per_quintal: fallbackPred,
      expected_gain_inr_per_quintal: gain,
      price_change_pct: changePct,
      forecast_horizon_days: horizonDays,
      confidence_score: 0.78,
      model_version: 'fallback-baseline-v1',
      is_demo_synthetic: true,
      data_classification: 'HEURISTIC FALLBACK (ML SERVICE OFFLINE)'
    };
  }

  async getPostHarvestDecision(data) {
    const res = await this.fetchApi('/recommendations/post-harvest', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res) return res;

    // In-memory calculation fallback
    const qty = data.quantity_kg || 4000;
    const qtl = qty / 100;
    const currPrice = data.current_local_price_inr_per_quintal || 2840;
    const immNet = Math.round(qtl * currPrice * 0.985);
    const storeNet = Math.round(qtl * currPrice * 1.10 - (qty * 0.08 * 21) - 1500);

    return {
      harvest_id: data.harvest_id || 'HAR_FALLBACK',
      crop_type: data.crop_type,
      quantity_kg: qty,
      recommended_option: storeNet > immNet ? 'store_then_sell' : 'sell_immediately',
      top_net_upside_inr: Math.max(0, storeNet - immNet),
      overall_confidence: 0.74,
      options: [
        {
          option_type: 'store_then_sell',
          title: 'Store for 21 Days',
          action_label: 'Store Produce',
          expected_gross_revenue_inr: Math.round(qtl * currPrice * 1.12),
          transport_cost_inr: 1500,
          storage_cost_inr: Math.round(qty * 0.08 * 21),
          handling_and_commission_inr: 1200,
          processing_fee_inr: 0,
          estimated_net_return_inr: storeNet,
          net_upside_vs_immediate_sale_inr: Math.max(0, storeNet - immNet),
          risk_level: 'medium',
          confidence_score: 0.74,
          rationale: 'Projected seasonal price rise covers storage costs.',
          assumptions: ['Standard 21 days holding period']
        },
        {
          option_type: 'sell_immediately',
          title: 'Sell Today at Local Mandi',
          action_label: 'Sell Immediately',
          expected_gross_revenue_inr: Math.round(qtl * currPrice),
          transport_cost_inr: 0,
          storage_cost_inr: 0,
          handling_and_commission_inr: Math.round(qtl * currPrice * 0.015),
          processing_fee_inr: 0,
          estimated_net_return_inr: immNet,
          net_upside_vs_immediate_sale_inr: 0,
          risk_level: 'low',
          confidence_score: 0.95,
          rationale: 'Instant cash realization at current mandi price.',
          assumptions: ['Immediate payment']
        }
      ],
      circular_biomass_opportunity: {
        residue_type: 'Crop Residue / Straw',
        estimated_residue_kg: Math.round(qty * 0.45),
        potential_circular_revenue_inr: Math.round(qty * 0.45 * 2.2),
        benefit_description: 'Sell residue to industrial buyers rather than burning.'
      },
      disclaimer: 'Fallback estimates calculated in Node.js backend.'
    };
  }

  async rankWarehouses(cropType, quantityKg, state, district, warehouses) {
    const res = await this.fetchApi('/recommendations/warehouse', {
      method: 'POST',
      body: JSON.stringify({
        crop_type: cropType,
        quantity_kg: quantityKg,
        state: state || 'Haryana',
        district: district || 'Karnal',
        warehouses
      })
    });
    return res ? res.ranked_warehouses : warehouses;
  }

  async rankTransporters(quantityKg, distanceKm, state, district, transporters, perishable = false) {
    const res = await this.fetchApi('/recommendations/transport', {
      method: 'POST',
      body: JSON.stringify({
        quantity_kg: quantityKg,
        distance_km: distanceKm,
        state: state || 'Haryana',
        district: district || 'Karnal',
        transporters,
        perishable
      })
    });
    return res ? res.ranked_transporters : transporters;
  }

  async matchBiomass(residueType, quantityKg, askingPrice, state, district, buyers) {
    const res = await this.fetchApi('/recommendations/biomass', {
      method: 'POST',
      body: JSON.stringify({
        residue_type: residueType,
        quantity_kg: quantityKg,
        asking_price_inr_per_kg: askingPrice,
        state: state || 'Haryana',
        district: district || 'Karnal',
        buyers
      })
    });
    return res ? res.matched_buyers : buyers;
  }
}

export const mlClient = new MLClient();
export default mlClient;
