import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password, role, state, district, phone } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Generate unique ID
    const newId = `USR${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    const password_hash = await bcrypt.hash(password, 10);

    const validRoles = ['farmer', 'industry_buyer', 'transport_provider', 'warehouse_operator', 'exporter', 'admin'];
    const normalizedRole = role ? String(role).toLowerCase().trim().replace(/[\s-]+/g, '_') : 'farmer';
    const assignedRole = validRoles.includes(normalizedRole) ? normalizedRole : 'farmer';

    const newUser = await User.create({
      _id: newId,
      user_id: newId,
      full_name: full_name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role: assignedRole,
      state: state || 'Haryana',
      district: district || 'Karnal',
      phone: phone || '',
      created_at: new Date(),
      account_status: 'active',
      data_source: 'live_user_registration'
    });

    const token = jwt.sign(
      { id: newUser._id, userId: newUser.user_id, role: newUser.role },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      data: {
        token,
        user: {
          id: newUser._id,
          user_id: newUser.user_id,
          full_name: newUser.full_name,
          email: newUser.email,
          role: newUser.role,
          state: newUser.state,
          district: newUser.district
        }
      },
      user: {
        id: newUser._id,
        user_id: newUser.user_id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        state: newUser.state,
        district: newUser.district
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, userId: user.user_id, role: user.role },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Signed in successfully.',
      token,
      data: {
        token,
        user: {
          id: user._id,
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          state: user.state,
          district: user.district
        }
      },
      user: {
        id: user._id,
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        state: user.state,
        district: user.district
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get current profile
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      user_id: req.user.user_id,
      full_name: req.user.full_name,
      email: req.user.email,
      role: req.user.role,
      state: req.user.state,
      district: req.user.district,
      phone: req.user.phone
    }
  });
});

export default router;
