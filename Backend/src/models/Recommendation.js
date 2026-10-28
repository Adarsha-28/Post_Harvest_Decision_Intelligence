import mongoose, { Schema } from 'mongoose';

const recommendationSchema = new Schema(
  {
    _id: { type: String, required: true },
    recommendation_id: { type: String, required: true, index: true },
    harvest_id: { type: String, required: true, index: true },
    option_type: { type: String, required: true },
    expected_revenue_inr: { type: Number, required: true },
    transport_cost_inr: { type: Number, default: 0 },
    storage_cost_inr: { type: Number, default: 0 },
    handling_and_commission_inr: { type: Number, default: 0 },
    estimated_net_profit_inr: { type: Number, required: true },
    risk_level: { type: String, default: 'medium' },
    confidence_score: { type: Number, default: 0.75 },
    generated_at: { type: Date, default: Date.now },
    model_status: { type: String, default: 'synthetic_demo_not_model_output' },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'recommendations',
    timestamps: false
  }
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);
export default Recommendation;
