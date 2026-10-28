import mongoose, { Schema } from 'mongoose';

const biomassSchema = new Schema(
  {
    _id: { type: String, required: true },
    listing_id: { type: String, required: true, index: true },
    farmer_user_id: { type: String, required: true, index: true },
    residue_type: { type: String, required: true, index: true },
    quantity_kg: { type: Number, required: true },
    moisture_pct: { type: Number, default: 15.0 },
    condition: { type: String, default: 'fresh' },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    asking_price_inr_per_kg: { type: Number, required: true },
    available_from: { type: Date, default: Date.now },
    status: { type: String, default: 'available' },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'biomass_listings',
    timestamps: false
  }
);

export const BiomassListing = mongoose.model('BiomassListing', biomassSchema);
export default BiomassListing;
