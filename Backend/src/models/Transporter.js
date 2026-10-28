import mongoose, { Schema } from 'mongoose';

const transportSchema = new Schema(
  {
    _id: { type: String, required: true },
    transport_id: { type: String, required: true, index: true },
    provider_user_id: { type: String, index: true },
    provider_name: { type: String, required: true },
    vehicle_type: { type: String, required: true },
    capacity_kg: { type: Number, required: true },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    rate_inr_per_km: { type: Number, required: true },
    base_fee_inr: { type: Number, default: 0 },
    refrigerated: { type: Boolean, default: false },
    availability_status: { type: String, default: 'available' },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'transport_services',
    timestamps: false
  }
);

export const Transporter = mongoose.model('Transporter', transportSchema);
export default Transporter;
