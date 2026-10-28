import mongoose, { Schema } from 'mongoose';

const marketPriceSchema = new Schema(
  {
    _id: { type: String, required: true },
    market_price_id: { type: String, required: true, index: true },
    market_name: { type: String, required: true },
    crop_type: { type: String, required: true, index: true },
    variety: { type: String },
    grade: { type: String },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true },
    price_date: { type: Date, required: true, index: true },
    min_price_inr_per_quintal: { type: Number, required: true },
    modal_price_inr_per_quintal: { type: Number, required: true },
    max_price_inr_per_quintal: { type: Number, required: true },
    commodity_unit: { type: String, default: 'INR_per_quintal' },
    source_name: { type: String, default: 'Synthetic demonstration data' },
    is_live_data: { type: Boolean, default: false, index: true },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'market_prices',
    timestamps: false
  }
);

marketPriceSchema.index({ crop_type: 1, state: 1, district: 1, price_date: -1 });

export const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);

const realMarketPriceSchema = new Schema(
  {
    _id: { type: String, required: true },
    market_price_id: { type: String, required: true, index: true },
    market_name: { type: String, required: true },
    crop_type: { type: String, required: true, index: true },
    variety: { type: String },
    grade: { type: String },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true },
    price_date: { type: Date, required: true, index: true },
    min_price_inr_per_quintal: { type: Number, required: true },
    modal_price_inr_per_quintal: { type: Number, required: true },
    max_price_inr_per_quintal: { type: Number, required: true },
    commodity_unit: { type: String, default: 'INR_per_quintal' },
    source_name: { type: String, default: 'data.gov.in (OGD Platform)' },
    is_live_data: { type: Boolean, default: true },
    data_source: { type: String, default: 'data.gov.in_ogd' }
  },
  {
    collection: 'real_market_prices',
    timestamps: false
  }
);

export const RealMarketPrice = mongoose.model('RealMarketPrice', realMarketPriceSchema);
export default MarketPrice;
