import mongoose, { Schema } from 'mongoose';

const bookingSchema = new Schema(
  {
    _id: { type: String, required: true },
    booking_id: { type: String, required: true, index: true },
    customer_user_id: { type: String, required: true, index: true },
    booking_type: {
      type: String,
      enum: ['storage', 'transport', 'crop_sale', 'biomass_purchase', 'warehouse_storage', 'freight_transport'],
      required: true,
      index: true
    },
    harvest_id: { type: String, index: true },
    warehouse_id: { type: String, index: true },
    transport_id: { type: String, index: true },
    buyer_id: { type: String, index: true },
    quantity_kg: { type: Number, required: true },
    estimated_cost_inr: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_transit', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    created_date: { type: Date, default: Date.now },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'bookings',
    timestamps: false
  }
);

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
