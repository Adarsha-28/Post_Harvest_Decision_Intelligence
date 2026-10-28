import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';
import mongoose from 'mongoose';

async function runTests() {
  console.log('=== AGRICONNECT AI BACKEND INTEGRATION TEST SUITE ===');
  let failures = 0;
  let server = null;
  const PORT = 5055;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  try {
    console.log('[1/12] Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('  -> PASS: Connected to MongoDB Atlas.');

    console.log('[2/12] Starting Express test server...');
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log(`  -> PASS: Express listening on ${BASE_URL}`);

    // Helper request
    const get = async (path) => {
      const res = await fetch(`${BASE_URL}${path}`);
      return { status: res.status, data: await res.json() };
    };

    const post = async (path, body) => {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { status: res.status, data: await res.json() };
    };

    // Test 3: Health check
    console.log('[3/12] Testing /health...');
    const health = await get('/health');
    if (health.status === 200 && health.data.status === 'UP') {
      console.log('  -> PASS: Health check verified UP.');
    } else {
      console.error('  -> FAIL: Health check:', health);
      failures++;
    }

    // Test 4: Harvests
    console.log('[4/12] Testing /api/harvests...');
    const harvests = await get('/api/harvests?limit=5');
    if (harvests.status === 200 && harvests.data.data.length > 0) {
      const sample = harvests.data.data[0];
      console.log(`  -> PASS: Retrieved ${harvests.data.data.length} harvests from Atlas. Sample crop: ${sample.crop || sample.crop_type}`);
    } else {
      console.error('  -> FAIL: Harvests query:', harvests);
      failures++;
    }

    // Test 5: Markets overview & prices
    console.log('[5/12] Testing /api/markets/overview...');
    const marketsOverview = await get('/api/markets/overview');
    if (marketsOverview.status === 200 && marketsOverview.data.meta.total_price_records > 0) {
      console.log(`  -> PASS: Total market price records in Atlas: ${marketsOverview.data.meta.total_price_records} (${marketsOverview.data.meta.verified_live_apmc_records} real APMC)`);
    } else {
      console.error('  -> FAIL: Markets overview:', marketsOverview);
      failures++;
    }

    // Test 6: Warehouses
    console.log('[6/12] Testing /api/warehouses...');
    const warehouses = await get('/api/warehouses?limit=5');
    if (warehouses.status === 200 && warehouses.data.data.length > 0) {
      const sample = warehouses.data.data[0];
      console.log(`  -> PASS: Retrieved ${warehouses.data.data.length} warehouses from Atlas. Sample: ${sample.name || sample.warehouse_name}`);
    } else {
      console.error('  -> FAIL: Warehouses query:', warehouses);
      failures++;
    }

    // Test 7: Logistics
    console.log('[7/12] Testing /api/logistics/transporters...');
    const logistics = await get('/api/logistics/transporters?limit=5');
    if (logistics.status === 200 && logistics.data.data.length > 0) {
      console.log(`  -> PASS: Retrieved ${logistics.data.data.length} transporters from Atlas.`);
    } else {
      console.error('  -> FAIL: Logistics query:', logistics);
      failures++;
    }

    // Test 8: Biomass & Industry Buyers
    console.log('[8/12] Testing /api/biomass and /api/buyers...');
    const biomass = await get('/api/biomass?limit=5');
    const buyers = await get('/api/buyers?limit=5');
    if (biomass.status === 200 && buyers.status === 200) {
      console.log(`  -> PASS: Retrieved ${biomass.data.data.length} biomass listings and ${buyers.data.data.length} industry buyers.`);
    } else {
      console.error('  -> FAIL: Biomass/Buyers query:', { biomass, buyers });
      failures++;
    }

    // Test 9: Bookings
    console.log('[9/12] Testing /api/bookings...');
    const bookings = await get('/api/bookings?limit=5');
    if (bookings.status === 200 && Array.isArray(bookings.data.data)) {
      console.log(`  -> PASS: Bookings endpoint responded with ${bookings.data.data.length} bookings.`);
    } else {
      console.error('  -> FAIL: Bookings query:', bookings);
      failures++;
    }

    // Test 10: Analytics Overview
    console.log('[10/12] Testing /api/analytics/overview...');
    const analytics = await get('/api/analytics/overview');
    if (analytics.status === 200 && analytics.data.data?.kpis) {
      console.log(`  -> PASS: Analytics overview KPI: Produce: ${analytics.data.data.kpis.harvests_registered}, Value: ${analytics.data.data.kpis.expected_value_inr}, Partners: ${analytics.data.data.kpis.connected_partners}`);
    } else {
      console.error('  -> FAIL: Analytics overview:', analytics);
      failures++;
    }

    // Test 11: Weather
    console.log('[11/12] Testing /api/ai/weather...');
    const weather = await get('/api/ai/weather?lat=29.6857&lng=76.9905');
    if (weather.status === 200 && weather.data.data?.risk_assessment) {
      console.log(`  -> PASS: Weather forecast received from ${weather.data.data.source}. Rain risk: ${weather.data.data.risk_assessment.rain_risk}`);
    } else {
      console.error('  -> FAIL: Weather endpoint:', weather);
      failures++;
    }

    // Test 12: Gemini AI Chat
    console.log('[12/12] Testing /api/ai/chat with live Gemini...');
    const aiChat = await post('/api/ai/chat', {
      prompt: 'I have 50 quintals of Basmati Paddy harvested in Karnal. Should I sell now or store in cold storage for 20 days?',
      crop_type: 'Basmati Rice',
      location: 'Karnal, Haryana'
    });
    if (aiChat.status === 200 && aiChat.data.data?.answer) {
      console.log(`  -> PASS: AI Assistant responded successfully using model [${aiChat.data.data.model_used}].`);
      console.log(`  Snippet: ${aiChat.data.data.answer.substring(0, 120)}...`);
    } else {
      console.error('  -> FAIL: AI Chat endpoint:', aiChat);
      failures++;
    }

  } catch (error) {
    console.error('Integration test exception:', error);
    failures++;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');

    console.log('====================================================');
    if (failures === 0) {
      console.log('ALL 12 BACKEND INTEGRATION CHECKS PASSED SUCCESSFULLY!');
    } else {
      console.error(`${failures} CHECK(S) FAILED.`);
    }
  }
}

runTests();
