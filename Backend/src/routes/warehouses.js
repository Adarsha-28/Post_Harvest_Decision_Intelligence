import { Router } from 'express';
import Warehouse from '../models/Warehouse.js';
import { mlClient } from '../services/mlClient.js';

const router = Router();

// List warehouses with search & filter
router.get('/', async (req, res, next) => {
  try {
    const { state, district, crop, temp_controlled, min_capacity, limit = 50 } = req.query;
    const filter = {};

    if (state) filter.state = new RegExp(state, 'i');
    if (district) filter.district = new RegExp(district, 'i');
    if (crop) filter.supported_crops = new RegExp(crop, 'i');
    if (temp_controlled !== undefined) filter.temperature_controlled = temp_controlled === 'true';
    if (min_capacity) filter.available_capacity_kg = { $gte: parseFloat(min_capacity) };

    const items = await Warehouse.find(filter)
      .sort({ available_capacity_kg: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: items.length,
      data: items.map(w => ({
        id: w._id,
        warehouseId: w.warehouse_id,
        name: w.warehouse_name,
        title: w.warehouse_name,
        type: w.storage_type,
        state: w.state,
        district: w.district,
        location: `${w.district}, ${w.state}`,
        capacityKg: w.capacity_kg,
        capacityTonnes: Math.round(w.capacity_kg / 1000),
        availableCapacityKg: w.available_capacity_kg,
        availableCapacityTonnes: Math.round(w.available_capacity_kg / 1000),
        occupancyPct: Math.round(((w.capacity_kg - w.available_capacity_kg) / w.capacity_kg) * 100),
        ratePerKgPerDay: w.rate_inr_per_kg_per_day,
        ratePerTonnePerDay: Math.round(w.rate_inr_per_kg_per_day * 1000),
        supportedCrops: w.supported_crops,
        temperatureControlled: w.temperature_controlled,
        status: w.availability_status
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Recommend & rank warehouses for a specific crop harvest
router.post('/recommend', async (req, res, next) => {
  try {
    const { crop_type, quantity_kg, state, district } = req.body;

    const nearby = await Warehouse.find({
      $or: [
        { district: new RegExp(district || 'Karnal', 'i') },
        { state: new RegExp(state || 'Haryana', 'i') }
      ],
      available_capacity_kg: { $gte: (parseFloat(quantity_kg) || 2000) * 0.5 }
    }).limit(20);

    const candidates = nearby.length > 0 ? nearby : await Warehouse.find().limit(10);

    const ranked = await mlClient.rankWarehouses(
      crop_type || 'Paddy',
      parseFloat(quantity_kg) || 4000,
      state || 'Haryana',
      district || 'Karnal',
      candidates.map(c => c.toObject())
    );

    res.json({
      success: true,
      count: ranked.length,
      data: ranked
    });
  } catch (err) {
    next(err);
  }
});

export default router;
