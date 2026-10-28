import mongoose, { Schema } from 'mongoose';

const warehouseSchema = new Schema(
  {
    _id: { type: String, required: true },
    warehouse_id: { type: String, required: true, index: true },
    operator_user_id: { type: String, index: true },
    warehouse_name: { type: String, required: true },
    storage_type: { type: String, default: 'Dry Warehouse' },
    state: { type: String, required: true, index: true },
    district: { type: String, required: true, index: true },
    capacity_kg: { type: Number, required: true },
    available_capacity_kg: { type: Number, required: true },
    rate_inr_per_kg_per_day: { type: Number, required: true },
    supported_crops: [{ type: String }],
    temperature_controlled: { type: Boolean, default: false },
    availability_status: { type: String, default: 'available' },
    latitude: { type: Number },
    longitude: { type: Number },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.0, 28.0] }
    },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'warehouses',
    timestamps: false
  }
);

warehouseSchema.index({ location: '2dsphere' });

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;
