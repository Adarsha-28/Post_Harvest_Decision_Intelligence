import { Router } from 'express';
import Harvest from '../models/Harvest.js';
import Recommendation from '../models/Recommendation.js';
import { MarketPrice } from '../models/MarketPrice.js';
import { mlClient } from '../services/mlClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get recommendations for a harvest or general list
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { harvestId, limit = 20 } = req.query;
    const filter = {};
    if (harvestId) filter.harvest_id = harvestId;

    let items = await Recommendation.find(filter)
      .sort({ generated_at: -1 })
      .limit(parseInt(limit, 10));

    // If no stored recommendation exists for a specific harvest, evaluate on-the-fly!
    if (items.length === 0 && harvestId) {
      const harvest = await Harvest.findById(harvestId) || await Harvest.findOne({ harvest_id: harvestId });
      if (harvest) {
        const latestPrice = await MarketPrice.findOne({
          crop_type: new RegExp(harvest.crop_type, 'i')
        }).sort({ price_date: -1 });

        const currPrice = latestPrice ? latestPrice.modal_price_inr_per_quintal : 2840;
        const evalResult = await mlClient.getPostHarvestDecision({
          harvest_id: harvest.harvest_id,
          crop_type: harvest.crop_type,
          quantity_kg: harvest.quantity_kg,
          current_local_price_inr_per_quintal: currPrice,
          state: harvest.state,
          district: harvest.district
        });

        return res.json({
          success: true,
          mode: 'dynamic_decision_engine',
          harvest_id: harvest.harvest_id,
          recommended_option: evalResult.recommended_option,
          top_net_upside_inr: evalResult.top_net_upside_inr,
          confidence_score: evalResult.overall_confidence,
          options: evalResult.options,
          circular_biomass_opportunity: evalResult.circular_biomass_opportunity,
          disclaimer: evalResult.disclaimer
        });
      }
    }

    res.json({
      success: true,
      count: items.length,
      data: items.map(r => ({
        id: r._id,
        harvestId: r.harvest_id,
        title: r.option_type.replace(/_/g, ' ').toUpperCase(),
        rationale: `Estimated net profit of INR ${r.estimated_net_profit_inr.toLocaleString()} with risk level ${r.risk_level}.`,
        estimatedNetValue: r.estimated_net_profit_inr,
        expectedRevenue: r.expected_revenue_inr,
        transportCost: r.transport_cost_inr,
        storageCost: r.storage_cost_inr,
        confidence: Math.round(r.confidence_score * 100),
        riskLevel: r.risk_level,
        dataFreshness: 'Refreshed today'
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Dynamic decision evaluation endpoint
router.post('/evaluate', authenticate, async (req, res, next) => {
  try {
    const {
      harvest_id,
      crop_type,
      quantity_kg,
      quantity_quintals,
      quantityTonnes,
      current_price,
      current_modal_price_inr,
      holding_days,
      storage_duration_days,
      state,
      district,
      has_biomass,
      biomass_type
    } = req.body;

    let harvestCrop = crop_type || 'Basmati Rice';
    let qty = 4000;
    if (quantity_quintals) {
      qty = parseFloat(quantity_quintals) * 100;
    } else if (quantity_kg) {
      qty = parseFloat(quantity_kg);
    } else if (quantityTonnes) {
      qty = parseFloat(quantityTonnes) * 1000;
    }

    let userState = state || 'Haryana';
    let userDist = district || 'Karnal';
    let holdingDays = storage_duration_days ? parseInt(storage_duration_days, 10) : (holding_days ? parseInt(holding_days, 10) : 21);

    if (harvest_id) {
      const h = await Harvest.findById(harvest_id) || await Harvest.findOne({ harvest_id });
      if (h) {
        harvestCrop = h.crop_type;
        qty = h.quantity_kg;
        userState = h.state;
        userDist = h.district;
      }
    }

    let currPrice = current_modal_price_inr ? parseFloat(current_modal_price_inr) : (current_price ? parseFloat(current_price) : 0);
    if (!currPrice || currPrice <= 0) {
      const latestPrice = await MarketPrice.findOne({
        crop_type: new RegExp(harvestCrop || 'Rice', 'i')
      }).sort({ price_date: -1 });
      currPrice = latestPrice ? latestPrice.modal_price_inr_per_quintal : 2840;
    }

    const decision = await mlClient.getPostHarvestDecision({
      harvest_id: harvest_id || 'HAR_CUSTOM',
      crop_type: harvestCrop,
      quantity_kg: qty,
      current_local_price_inr_per_quintal: currPrice,
      holding_days_intended: holdingDays,
      state: userState,
      district: userDist
    });

    const qtl = qty / 100;
    const immNet = Math.round(qtl * currPrice * 0.985);
    const storeGross = Math.round(qtl * currPrice * 1.12);
    const storeCosts = Math.round((qty * 0.08 * holdingDays) + 1500 + 1200);
    const storeNet = storeGross - storeCosts;
    const altGross = Math.round(qtl * currPrice * 1.07);
    const altCosts = Math.round(2400 + (qtl * currPrice * 0.02));
    const altNet = altGross - altCosts;
    const procGross = Math.round(qtl * currPrice * 1.05 + (has_biomass ? qtl * 80 : 0));
    const procCosts = Math.round(1800 + (qtl * currPrice * 0.015));
    const procNet = procGross - procCosts;

    // Determine top pathway
    const pathwayNets = [
      { pathway: 'store_then_sell', net: storeNet },
      { pathway: 'sell_immediately', net: immNet },
      { pathway: 'alternate_market', net: altNet },
      { pathway: 'processing_and_biomass', net: procNet }
    ];
    pathwayNets.sort((a, b) => b.net - a.net);
    const topPathway = pathwayNets[0].pathway;

    const recommendations = [
      {
        pathway: 'store_then_sell',
        label: `Store in Cold Storage (${holdingDays} Days)`,
        estimated_net_return_inr: storeNet,
        gross_revenue_inr: storeGross,
        total_costs_inr: storeCosts,
        cost_breakdown: {
          storage_fee: Math.round(qty * 0.08 * holdingDays),
          freight_transport: 1500,
          handling_and_grading: 1200
        },
        upside_vs_immediate_sale_inr: Math.max(0, storeNet - immNet),
        confidence_score: 78,
        recommended: topPathway === 'store_then_sell',
        reasoning: `Projected seasonal price increase covers storage fees with an estimated net gain of ₹${Math.max(0, storeNet - immNet).toLocaleString()}.`,
        risks: ['Storage humidity control', 'Minor market volatility']
      },
      {
        pathway: 'sell_immediately',
        label: 'Sell Immediately at Local Mandi',
        estimated_net_return_inr: immNet,
        gross_revenue_inr: Math.round(qtl * currPrice),
        total_costs_inr: Math.round(qtl * currPrice * 0.015),
        cost_breakdown: {
          storage_fee: 0,
          freight_transport: 400,
          handling_and_grading: Math.round(qtl * currPrice * 0.015)
        },
        upside_vs_immediate_sale_inr: 0,
        confidence_score: 95,
        recommended: topPathway === 'sell_immediately',
        reasoning: 'Zero storage risk with instant cash realization at prevailing APMC mandi modal price.',
        risks: ['Foregoes upcoming seasonal price spikes']
      },
      {
        pathway: 'alternate_market',
        label: 'Inter-District Direct Trade',
        estimated_net_return_inr: altNet,
        gross_revenue_inr: altGross,
        total_costs_inr: altCosts,
        cost_breakdown: {
          storage_fee: 0,
          freight_transport: 2400,
          handling_and_grading: Math.round(qtl * currPrice * 0.02)
        },
        upside_vs_immediate_sale_inr: altNet - immNet,
        confidence_score: 72,
        recommended: topPathway === 'alternate_market',
        reasoning: 'Adjacent consumer district mandi offers premium rates offsetting additional freight cost.',
        risks: ['Transit delay', 'Variable arrival inspection']
      },
      {
        pathway: 'processing_and_biomass',
        label: has_biomass ? 'Industry Contract + Biomass Sale' : 'Direct Food Processor Contract',
        estimated_net_return_inr: procNet,
        gross_revenue_inr: procGross,
        total_costs_inr: procCosts,
        cost_breakdown: {
          storage_fee: 0,
          freight_transport: 1800,
          handling_and_grading: Math.round(qtl * currPrice * 0.015)
        },
        upside_vs_immediate_sale_inr: procNet - immNet,
        confidence_score: 84,
        recommended: topPathway === 'processing_and_biomass',
        reasoning: has_biomass
          ? 'Guaranteed procurement pricing plus circular valorization of crop residues.'
          : 'Stable institutional off-taker contract with minimum guaranteed realization.',
        risks: ['Strict moisture standard compliance']
      }
    ];

    res.json({
      success: true,
      data: {
        harvest_id: harvest_id || 'HAR_CUSTOM',
        crop_type: harvestCrop,
        quantity_quintals: qtl,
        quantity_kg: qty,
        current_modal_price_inr: currPrice,
        holding_days: holdingDays,
        recommended_pathway: topPathway,
        top_net_upside_inr: Math.max(0, storeNet - immNet),
        confidence_score: 82,
        recommendations,
        options: decision?.options || [],
        circular_biomass_opportunity: decision?.circular_biomass_opportunity
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
