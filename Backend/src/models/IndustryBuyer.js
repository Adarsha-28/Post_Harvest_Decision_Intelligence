import mongoose, { Schema } from 'mongoose';

const buyerSchema = new Schema(
  {
    _id: { type: String, required: true },
    buyer_id: { type: String, required: true, index: true },
    buyer_user_id: { type: String, index: true },
    company_name: { type: String, required: true },
    buyer_category: { type: String, default: 'Grain Trader' },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    accepted_crops: [{ type: String }],
    accepted_residues: [{ type: String }],
    required_quantity_kg: { type: Number, required: true },
    offer_price_inr_per_kg: { type: Number, required: true },
    buyer_status: { type: String, default: 'verified' },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'industry_buyers',
    timestamps: false
  }
);

export const IndustryBuyer = mongoose.model('IndustryBuyer', buyerSchema);
export default IndustryBuyer;
