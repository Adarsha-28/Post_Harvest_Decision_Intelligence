import mongoose, { Schema } from 'mongoose';

const harvestSchema = new Schema(
  {
    _id: { type: String, required: true }, // e.g. HAR0000001
    harvest_id: { type: String, required: true, index: true },
    farmer_user_id: { type: String, required: true, index: true },
    crop_type: { type: String, required: true, trim: true },
    crop_category: { type: String, default: 'cereal' },
    quantity_kg: { type: Number, required: true, min: 0 },
    harvest_date: { type: Date, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.0, 28.0] } // [lng, lat]
    },
    moisture_pct: { type: Number, min: 0, max: 100 },
    quality_grade: { type: String, default: 'Grade A' },
    expected_sale_date: { type: Date },
    status: {
      type: String,
      enum: ['registered', 'recommended', 'stored', 'in_transit', 'sold', 'Decision ready'],
      default: 'Decision ready'
    },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'harvests',
    timestamps: false
  }
);

harvestSchema.index({ location: '2dsphere' });
harvestSchema.index({ crop_type: 1, state: 1, district: 1 });

export const Harvest = mongoose.model('Harvest', harvestSchema);
export default Harvest;
