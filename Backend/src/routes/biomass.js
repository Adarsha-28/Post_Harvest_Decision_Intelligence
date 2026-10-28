import { Router } from 'express';
import BiomassListing from '../models/BiomassListing.js';
import IndustryBuyer from '../models/IndustryBuyer.js';
import { mlClient } from '../services/mlClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// List biomass listings (GET /api/biomass or /api/biomass/listings)
router.get(['/', '/listings'], async (req, res, next) => {
  try {
    const { residue_type, state, district, limit = 50 } = req.query;
    const filter = {};

    if (residue_type) filter.residue_type = new RegExp(residue_type, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (district) filter.district = new RegExp(district, 'i');

    const items = await BiomassListing.find(filter)
      .sort({ available_from: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: items.length,
      data: items.map(b => ({
        id: b._id,
        listingId: b.listing_id,
        title: `${b.residue_type} (${(b.quantity_kg / 1000).toFixed(1)} t)`,
        residueType: b.residue_type,
        quantityKg: b.quantity_kg,
        quantityTonnes: Math.round((b.quantity_kg / 1000) * 10) / 10,
        askingPricePerKg: b.asking_price_inr_per_kg,
        totalValue: Math.round(b.quantity_kg * b.asking_price_inr_per_kg),
        condition: b.condition,
        moisturePct: b.moisture_pct,
        location: `${b.district}, ${b.state}`,
        state: b.state,
        district: b.district,
        availableFrom: b.available_from,
        status: b.status
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Create new biomass listing
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { residue_type, quantity_kg, asking_price_inr_per_kg, condition, moisture_pct, state, district } = req.body;
    if (!residue_type || !quantity_kg) {
      return res.status(400).json({ success: false, message: 'Residue type and quantity are required.' });
    }

    const count = await BiomassListing.countDocuments();
    const newId = `BIO${String(count + 1).padStart(7, '0')}`;

    const newListing = await BiomassListing.create({
      _id: newId,
      listing_id: newId,
      farmer_user_id: req.user?.user_id || 'USR000001',
      residue_type: residue_type.trim(),
      quantity_kg: parseFloat(quantity_kg),
      moisture_pct: moisture_pct ? parseFloat(moisture_pct) : 15.0,
      condition: condition || 'fresh',
      state: state || 'Haryana',
      district: district || 'Karnal',
      asking_price_inr_per_kg: asking_price_inr_per_kg ? parseFloat(asking_price_inr_per_kg) : 2.50,
      available_from: new Date(),
      status: 'available',
      data_source: 'live_farmer_entry'
    });

    res.status(201).json({
      success: true,
      message: 'Residue listed on circular biomass marketplace.',
      data: newListing
    });
  } catch (err) {
    next(err);
  }
});

// Match residue with active buyers
router.post('/match', async (req, res, next) => {
  try {
    const { residue_type, quantity_kg, asking_price, state, district } = req.body;

    const buyers = await IndustryBuyer.find({
      $or: [
        { accepted_residues: new RegExp(residue_type || 'Straw', 'i') },
        { district: new RegExp(district || 'Karnal', 'i') }
      ]
    }).limit(15);

    const candidates = buyers.length > 0 ? buyers : await IndustryBuyer.find().limit(10);

    const matches = await mlClient.matchBiomass(
      residue_type || 'Paddy Straw',
      parseFloat(quantity_kg) || 3000,
      parseFloat(asking_price) || 2.20,
      state || 'Haryana',
      district || 'Karnal',
      candidates.map(c => c.toObject())
    );

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (err) {
    next(err);
  }
});

export default router;
