import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config(); // Render & production environment
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../Backend/.env') });

function getOrsKey() {
  const raw = process.env.OPENROUTESERVICE_API_KEY || process.env.WEATHER || '';
  if (raw.startsWith('eyJ')) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (parsed.org && parsed.id) {
        return `${parsed.org}${parsed.id}`;
      }
    } catch (e) {}
  }
  return raw;
}

function getDataGovKey() {
  if (process.env.DATA_GOV_API_KEY) return process.env.DATA_GOV_API_KEY.trim();
  if (process.env.DATAGOV_API_KEY) return process.env.DATAGOV_API_KEY.trim();
  const raw = process.env.DATA_GOVT || process.env.DAILY || '';
  const match = raw.match(/resource\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '579b464db66ec23bdd00000130be8d2f042541e47b716865adf6789e';
}

function getWeatherKey() {
  if (process.env.WEATHER_API_KEY) return process.env.WEATHER_API_KEY.trim();
  const routeVal = (process.env.ROUTE || '').trim();
  if (routeVal && routeVal.length >= 28 && routeVal.length <= 36) {
    return routeVal;
  }
  return 'ffc7f5d96164473cacf50621261910';
}

function getGeminiModel() {
  const m = (process.env.GEMINI_MODEL || '').trim();
  if (m === 'gemini-3.8-flash' || !m) {
    return 'gemini-1.5-flash';
  }
  return m;
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: (process.env.MONGODB_URI || '').trim(),
  jwtSecret: (process.env.JWT_SECRET || 'agriconnect_ai_dev_jwt_secret_2026').trim(),
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').trim(),
  mlServiceUrl: (process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000').trim(),
  
  // External APIs
  dataGovApiKey: getDataGovKey(),
  dataGovResource: (process.env.DATA_GOVT || process.env.DAILY || 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070').trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  geminiModel: getGeminiModel(),
  
  // Weather API (WeatherAPI.com from ROUTE variable, or Open-Meteo)
  weatherApiKey: getWeatherKey(),
  
  // OpenRouteService
  openRouteServiceApiKey: getOrsKey().trim()
};
