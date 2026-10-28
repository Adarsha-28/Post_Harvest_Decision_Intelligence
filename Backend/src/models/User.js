import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
  {
    _id: { type: String, required: true }, // e.g. USR000001
    user_id: { type: String, required: true, index: true },
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String },
    role: {
      type: String,
      enum: ['farmer', 'industry_buyer', 'transport_provider', 'warehouse_operator', 'exporter', 'admin'],
      default: 'farmer'
    },
    state: { type: String, default: 'Haryana' },
    district: { type: String, default: 'Karnal' },
    phone: { type: String, trim: true },
    created_at: { type: Date, default: Date.now },
    account_status: { type: String, default: 'active' },
    data_source: { type: String, default: 'synthetic_demo' }
  },
  {
    collection: 'users',
    timestamps: false
  }
);

userSchema.methods.comparePassword = async function (password) {
  if (!this.password_hash) {
    // Demo accounts have standard dev password fallback
    return password === 'Password@123' || password === 'agriconnect123';
  }
  return bcrypt.compare(password, this.password_hash);
};

export const User = mongoose.model('User', userSchema);
export default User;
