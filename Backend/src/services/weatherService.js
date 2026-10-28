import { env } from '../config/env.js';

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getWeatherForecast(lat = 29.6857, lng = 76.9905) {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // 1. Try WeatherAPI.com if key is present
  if (env.weatherApiKey) {
    try {
      const weatherApiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${env.weatherApiKey}&q=${lat},${lng}&days=5&aqi=no`;
      const res = await fetch(weatherApiUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const current = data.current || {};
        const forecastDays = data.forecast?.forecastday || [];

        const totalRain = forecastDays.reduce((sum, d) => sum + (d.day?.totalprecip_mm || 0), 0);
        const maxRainChance = Math.max(...forecastDays.map(d => d.day?.daily_chance_of_rain || 0), 0);

        let rainRisk = 'low';
        let advisory = 'Weather conditions favorable for open handling and covered storage.';
        if (totalRain > 25 || maxRainChance > 70) {
          rainRisk = 'high';
          advisory = 'Heavy rain risk detected. Immediate covered warehouse storage strongly advised.';
        } else if (totalRain > 8 || maxRainChance > 40) {
          rainRisk = 'medium';
          advisory = 'Moderate showers possible. Ensure moisture tarpaulins are prepared.';
        }

        const formatted = {
          source: 'WeatherAPI.com Live API',
          location: `${data.location?.name || 'Karnal'}, ${data.location?.region || 'Haryana'}`,
          latitude: lat,
          longitude: lng,
          current: {
            temperature_c: current.temp_c,
            humidity_pct: current.humidity,
            precipitation_mm: current.precip_mm,
            condition_text: current.condition?.text,
            time: current.last_updated
          },
          forecast: forecastDays.map(d => ({
            date: d.date,
            max_temp_c: d.day?.maxtemp_c,
            min_temp_c: d.day?.mintemp_c,
            precipitation_mm: d.day?.totalprecip_mm,
            rain_probability_pct: d.day?.daily_chance_of_rain
          })),
          risk_assessment: {
            rain_risk: rainRisk,
            precipitation_total_mm: Math.round(totalRain * 10) / 10,
            max_rain_probability_pct: maxRainChance,
            advisory
          }
        };

        cache.set(cacheKey, { timestamp: now, data: formatted });
        return formatted;
      }
    } catch (e) {
      console.warn(`[Weather Service] WeatherAPI call failed (${e.message}); using Open-Meteo.`);
    }
  }

  // 2. Open-Meteo API (High-reliability meteorological fallback/primary)
  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=5`;

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Open-Meteo returned status ${res.status}`);
    const data = await res.json();

    const current = data.current || {};
    const daily = data.daily || {};

    const precipSum = (daily.precipitation_sum || []).reduce((a, b) => a + b, 0);
    const maxProb = Math.max(...(daily.precipitation_probability_max || [0]));

    let rainRisk = 'low';
    let advisory = 'Weather conditions favorable for open handling and covered storage.';
    if (precipSum > 30 || maxProb > 70) {
      rainRisk = 'high';
      advisory = 'Heavy rain risk detected. Immediate covered warehouse storage strongly advised.';
    } else if (precipSum > 10 || maxProb > 40) {
      rainRisk = 'medium';
      advisory = 'Moderate showers possible. Ensure moisture tarpaulins are prepared.';
    }

    const formatted = {
      source: 'Open-Meteo Live API',
      latitude: lat,
      longitude: lng,
      current: {
        temperature_c: current.temperature_2m,
        humidity_pct: current.relative_humidity_2m,
        precipitation_mm: current.precipitation,
        weather_code: current.weather_code,
        time: current.time
      },
      forecast: (daily.time || []).map((date, idx) => ({
        date,
        max_temp_c: daily.temperature_2m_max?.[idx],
        min_temp_c: daily.temperature_2m_min?.[idx],
        precipitation_mm: daily.precipitation_sum?.[idx],
        rain_probability_pct: daily.precipitation_probability_max?.[idx]
      })),
      risk_assessment: {
        rain_risk: rainRisk,
        precipitation_total_mm: Math.round(precipSum * 10) / 10,
        max_rain_probability_pct: maxProb,
        advisory
      }
    };

    cache.set(cacheKey, { timestamp: now, data: formatted });
    return formatted;
  } catch (error) {
    console.warn(`[Weather Service Warning] Could not fetch Open-Meteo (${error.message}). Using fallback.`);
    return {
      source: 'Local Climate Baseline (Offline Fallback)',
      latitude: lat,
      longitude: lng,
      current: {
        temperature_c: 28.5,
        humidity_pct: 65,
        precipitation_mm: 0.0,
        weather_code: 0,
        time: new Date().toISOString()
      },
      risk_assessment: {
        rain_risk: 'low',
        precipitation_total_mm: 0,
        max_rain_probability_pct: 10,
        advisory: 'Stable conditions expected. Low rainfall probability.'
      }
    };
  }
}
