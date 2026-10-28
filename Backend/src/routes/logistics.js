import { Router } from 'express';
import Transporter from '../models/Transporter.js';
import { calculateRoute } from '../services/routingService.js';
import { mlClient } from '../services/mlClient.js';

const router = Router();

function getTransporterPhone(t) {
  if (t.contact_phone) return t.contact_phone;
  if (t.phone) return t.phone;
  const seed = (t.provider_name || t.name || t.transport_id || 'transporter')
    .split('')
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const num = 9812000000 + (seed * 179) % 8999999;
  return `+91 ${String(num).slice(0, 5)} ${String(num).slice(5)}`;
}

const getTransporters = async (req, res, next) => {
  try {
    const { vehicle_type, state, district, refrigerated, limit = 50 } = req.query;
    const filter = {};

    if (vehicle_type) filter.vehicle_type = new RegExp(vehicle_type, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (district) filter.district = new RegExp(district, 'i');
    if (refrigerated !== undefined) filter.refrigerated = refrigerated === 'true';

    const items = await Transporter.find(filter)
      .sort({ capacity_kg: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: items.length,
      data: items.map(t => {
        const phone = getTransporterPhone(t);
        return {
          id: t._id,
          transportId: t.transport_id,
          providerName: t.provider_name,
          name: t.provider_name,
          contactPhone: phone,
          contact_phone: phone,
          phone,
          vehicleType: t.vehicle_type,
          capacityKg: t.capacity_kg,
          capacityTonnes: Math.round((t.capacity_kg / 1000) * 10) / 10,
          ratePerKm: t.rate_inr_per_km,
          baseFee: t.base_fee_inr,
          refrigerated: t.refrigerated,
          state: t.state,
          district: t.district,
          location: `${t.district}, ${t.state}`,
          status: t.availability_status
        };
      })
    });
  } catch (err) {
    next(err);
  }
};

router.get('/', getTransporters);
router.get('/transporters', getTransporters);

// Calculate quote & rank transporters
router.post('/quote', async (req, res, next) => {
  try {
    const { quantity_kg, origin_coords, dest_coords, distance_km, state, district, perishable } = req.body;

    let routeInfo = {
      distance_km: distance_km ? parseFloat(distance_km) : 35.0,
      duration_minutes: 60,
      source: 'Direct Input'
    };

    if (origin_coords && dest_coords) {
      routeInfo = await calculateRoute(origin_coords, dest_coords);
    }

    const transporters = await Transporter.find({
      $or: [
        { district: new RegExp(district || 'Karnal', 'i') },
        { state: new RegExp(state || 'Haryana', 'i') }
      ]
    }).limit(15);

    const candidates = transporters.length > 0 ? transporters : await Transporter.find().limit(10);

    const ranked = await mlClient.rankTransporters(
      parseFloat(quantity_kg) || 4000,
      routeInfo.distance_km,
      state || 'Haryana',
      district || 'Karnal',
      candidates.map(c => c.toObject()),
      perishable || false
    );

    const mappedRanked = (ranked || []).map(rt => {
      const phone = getTransporterPhone(rt);
      return {
        ...rt,
        contact_phone: phone,
        contactPhone: phone,
        phone
      };
    });

    res.json({
      success: true,
      route: routeInfo,
      ranked_transporters: mappedRanked
    });
  } catch (err) {
    next(err);
  }
});

export default router;
