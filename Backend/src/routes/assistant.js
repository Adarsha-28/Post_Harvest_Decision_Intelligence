import { Router } from 'express';
import { askAgriculturalAssistant } from '../services/geminiAssistantService.js';
import { getWeatherForecast } from '../services/weatherService.js';
import { Harvest } from '../models/Harvest.js';
import { MarketPrice } from '../models/MarketPrice.js';
import { Warehouse } from '../models/Warehouse.js';

const router = Router();

// POST /api/ai/chat or /api/ai/ask
router.post(['/chat', '/ask'], async (req, res, next) => {
  try {
    const { prompt, query, message, harvest_id, crop_type, location } = req.body;
    const promptText = prompt || query || message;
    if (!promptText) {
      return res.status(400).json({ success: false, message: 'prompt or query is required.' });
    }

    // Build structured real-world context for Gemini
    const context = {
      timestamp: new Date().toISOString(),
      user_profile: {
        role: 'Farmer',
        region: location || 'Karnal, Haryana'
      }
    };

    // If harvest_id or crop_type is given, fetch live data
    if (harvest_id) {
      const harvest = await Harvest.findById(harvest_id);
      if (harvest) {
        context.harvest = {
          crop_type: harvest.crop_type,
          variety: harvest.variety,
          quantity_quintals: harvest.quantity_quintals,
          quality_grade: harvest.quality_grade,
          moisture_percentage: harvest.moisture_percentage,
          harvest_date: harvest.harvest_date,
          location: `${harvest.district}, ${harvest.state}`
        };
      }
    }

    const targetCrop = crop_type || context.harvest?.crop_type || 'Basmati Rice';

    // Fetch latest market benchmarks
    const latestPrice = await MarketPrice.findOne({
      crop_type: new RegExp(`^${targetCrop}$`, 'i')
    }).sort({ price_date: -1 });

    if (latestPrice) {
      context.market_benchmark = {
        crop: latestPrice.crop_type,
        market: latestPrice.market_name,
        modal_price_inr: latestPrice.modal_price_inr_per_quintal,
        min_price_inr: latestPrice.min_price_inr_per_quintal,
        max_price_inr: latestPrice.max_price_inr_per_quintal,
        price_date: latestPrice.price_date,
        is_live_apmc: latestPrice.is_live_data
      };
    }

    // Fetch local weather
    const weather = await getWeatherForecast(29.6857, 76.9905);
    context.weather_outlook = {
      temperature_c: weather.current?.temperature_c,
      rain_risk: weather.risk_assessment?.rain_risk,
      advisory: weather.risk_assessment?.advisory
    };

    // Fetch nearby storage availability
    const warehouseSample = await Warehouse.findOne({
      is_operational: true,
      available_capacity_mt: { $gt: 10 }
    });
    if (warehouseSample) {
      context.available_storage_sample = {
        name: warehouseSample.warehouse_name,
        type: warehouseSample.facility_type,
        rate_per_day_inr: warehouseSample.storage_rate_per_quintal_day,
        available_capacity_mt: warehouseSample.available_capacity_mt
      };
    }

    const aiResult = await askAgriculturalAssistant(promptText, context);

    res.json({
      success: true,
      data: aiResult,
      grounded_context_summary: {
        crop: targetCrop,
        latest_modal_price: latestPrice?.modal_price_inr_per_quintal || 'N/A',
        rain_risk: weather.risk_assessment?.rain_risk
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/weather
router.get('/weather', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat) || 29.6857;
    const lng = parseFloat(req.query.lng) || 76.9905;

    const weather = await getWeatherForecast(lat, lng);
    res.json({
      success: true,
      data: weather
    });
  } catch (err) {
    next(err);
  }
});

export default router;
