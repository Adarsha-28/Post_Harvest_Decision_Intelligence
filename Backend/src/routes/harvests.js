import { Router } from 'express';
import Harvest from '../models/Harvest.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// List harvests (My lots vs All 25,005 database lots)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { crop_type, crop, state, district, search, status, scope = 'my', page = 1, limit = 50 } = req.query;
    const filter = {};

    const targetCrop = crop || crop_type;
    if (targetCrop) filter.crop_type = new RegExp(targetCrop.trim(), 'i');
    if (state) filter.state = new RegExp(state.trim(), 'i');
    if (district) filter.district = new RegExp(district.trim(), 'i');
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { crop_type: new RegExp(search.trim(), 'i') },
        { district: new RegExp(search.trim(), 'i') },
        { state: new RegExp(search.trim(), 'i') },
        { quality_grade: new RegExp(search.trim(), 'i') }
      ];
    }

    const userId = req.user?.user_id || req.user?._id;

    // If scope is 'my', filter by user's identity & live entry demo items
    if (scope === 'my' && userId) {
      const userConditions = [
        { farmer_user_id: userId },
        { farmer_user_id: req.user?.user_id },
        { farmer_user_id: req.user?._id },
        { data_source: 'live_farmer_entry' },
        { farmer_user_id: 'USR000001' },
        { farmer_user_id: 'USR005001' }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: userConditions }, { $or: filter.$or }];
        delete filter.$or;
      } else {
        filter.$or = userConditions;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      Harvest.countDocuments(filter),
      Harvest.find(filter)
        .sort({ harvest_date: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      count: items.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      limit: limitNum,
      scope,
      data: items.map(h => ({
        id: h._id,
        harvest_id: h.harvest_id,
        crop: h.crop_type,
        crop_type: h.crop_type,
        crop_category: h.crop_category,
        variety: h.variety || h.quality_grade || 'Standard',
        quantityKg: h.quantity_kg,
        quantityTonnes: Math.round((h.quantity_kg / 1000) * 10) / 10,
        quantity_quintals: Math.round((h.quantity_kg / 100) * 10) / 10,
        qty: `${(h.quantity_kg / 1000).toFixed(1)} tonnes`,
        location: `${h.district}, ${h.state}`,
        district: h.district,
        state: h.state,
        date: new Date(h.harvest_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        harvestDate: h.harvest_date,
        quality: h.quality_grade || 'Grade A',
        qualityGrade: h.quality_grade || 'Grade A',
        moisture_pct: h.moisture_pct,
        moisturePercentage: h.moisture_pct,
        status: h.status || 'Active',
        data_source: h.data_source,
        tone: h.status === 'sold' ? 'gray' : (h.status === 'stored' ? 'blue' : 'green')
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Create new harvest
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      crop,
      crop_type,
      quantityKg,
      quantityTonnes,
      quantity_quintals,
      quantity,
      location,
      state,
      district,
      harvestDate,
      harvest_date,
      quality,
      quality_grade,
      variety,
      moisture_pct,
      moisture_percentage
    } = req.body;
    
    const cropName = crop || crop_type;
    if (!cropName) {
      return res.status(400).json({ success: false, message: 'Crop type is required.' });
    }

    let qty = 3000;
    if (quantityKg) {
      qty = parseFloat(quantityKg);
    } else if (quantityTonnes) {
      qty = parseFloat(quantityTonnes) * 1000;
    } else if (quantity_quintals) {
      qty = parseFloat(quantity_quintals) * 100;
    } else if (quantity) {
      qty = parseFloat(quantity) * 100;
    }
    
    // Safe unique ID generation
    const newId = `HAR${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    
    // Parse location string if provided as "District, State"
    let st = state || req.user?.state || 'Haryana';
    let dist = district || req.user?.district || 'Karnal';
    if (location && location.includes(',')) {
      const parts = location.split(',');
      dist = parts[0].trim();
      st = parts[1].trim();
    }

    const moisture = moisture_pct ? parseFloat(moisture_pct) : (moisture_percentage ? parseFloat(moisture_percentage) : 13.5);
    const grade = quality_grade || quality || 'Grade A';
    const cropVariety = variety || 'Standard';

    const newHarvest = await Harvest.create({
      _id: newId,
      harvest_id: newId,
      farmer_user_id: req.user?.user_id || req.user?._id || 'USR005001',
      crop_type: cropName.trim(),
      crop_category: 'cereal',
      quantity_kg: qty,
      harvest_date: (harvestDate || harvest_date) ? new Date(harvestDate || harvest_date) : new Date(),
      state: st,
      district: dist,
      latitude: 29.6857,
      longitude: 76.9905,
      location: {
        type: 'Point',
        coordinates: [76.9905, 29.6857]
      },
      moisture_pct: moisture,
      quality_grade: grade,
      status: 'Decision ready',
      data_source: 'live_farmer_entry'
    });

    res.status(201).json({
      success: true,
      message: 'Harvest registered successfully.',
      data: {
        id: newHarvest._id,
        harvest_id: newHarvest.harvest_id,
        crop: newHarvest.crop_type,
        crop_type: newHarvest.crop_type,
        variety: cropVariety,
        quantityKg: newHarvest.quantity_kg,
        quantityTonnes: newHarvest.quantity_kg / 1000,
        quantity_quintals: newHarvest.quantity_kg / 100,
        qty: `${(newHarvest.quantity_kg / 1000).toFixed(1)} tonnes`,
        location: `${newHarvest.district}, ${newHarvest.state}`,
        district: newHarvest.district,
        state: newHarvest.state,
        date: new Date(newHarvest.harvest_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        harvestDate: newHarvest.harvest_date,
        quality: newHarvest.quality_grade,
        qualityGrade: newHarvest.quality_grade,
        status: newHarvest.status
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get single harvest
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await Harvest.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Harvest not found.' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// Delete harvest
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await Harvest.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Harvest not found.' });
    }
    res.json({ success: true, message: 'Harvest deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
