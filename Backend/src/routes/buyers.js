import { Router } from 'express';
import IndustryBuyer from '../models/IndustryBuyer.js';

const router = Router();

// List industry buyers
router.get('/', async (req, res, next) => {
  try {
    const { category, state, district, crop, residue, limit = 50 } = req.query;
    const filter = {};

    if (category) filter.buyer_category = new RegExp(category, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (district) filter.district = new RegExp(district, 'i');
    if (crop) filter.accepted_crops = new RegExp(crop, 'i');
    if (residue) filter.accepted_residues = new RegExp(residue, 'i');

    const items = await IndustryBuyer.find(filter)
      .sort({ required_quantity_kg: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: items.length,
      data: items.map(b => ({
        id: b._id,
        buyerId: b.buyer_id,
        companyName: b.company_name,
        category: b.buyer_category,
        location: `${b.district}, ${b.state}`,
        state: b.state,
        district: b.district,
        acceptedCrops: b.accepted_crops,
        acceptedResidues: b.accepted_residues,
        requiredQuantityKg: b.required_quantity_kg,
        offerPricePerKg: b.offer_price_inr_per_kg,
        status: b.buyer_status
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
