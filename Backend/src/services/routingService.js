import { env } from '../config/env.js';

// Haversine formula for great circle distance
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function calculateRoute(fromCoords, toCoords) {
  // fromCoords, toCoords: [longitude, latitude]
  const [fromLng, fromLat] = fromCoords;
  const [toLng, toLat] = toCoords;

  if (env.openRouteServiceApiKey && env.openRouteServiceApiKey.length > 20) {
    try {
      const endpoint = 'https://api.openrouteservice.org/v2/directions/driving-car';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': env.openRouteServiceApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/geo+json'
        },
        body: JSON.stringify({
          coordinates: [[fromLng, fromLat], [toLng, toLat]]
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        const route = data.routes?.[0]?.summary;
        if (route) {
          return {
            distance_km: Math.round((route.distance / 1000.0) * 10) / 10,
            duration_minutes: Math.round(route.duration / 60.0),
            source: 'OpenRouteService Live API',
            status: 'VERIFIED_API'
          };
        }
      }
    } catch (e) {
      console.warn(`[Routing] ORS API call failed (${e.message}); using road factor geometry.`);
    }
  }

  // Robust road estimation: Haversine * 1.28 road winding factor
  const directKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const roadKm = Math.max(2.0, Math.round(directKm * 1.28 * 10) / 10);
  const avgSpeedKmph = 42.0; // Standard rural freight speed in India
  const minutes = Math.round((roadKm / avgSpeedKmph) * 60) + 15; // +15 min loading buffer

  return {
    distance_km: roadKm,
    duration_minutes: minutes,
    source: 'Calibrated Road Geometry (Fallback Model)',
    status: 'CALCULATED_ESTIMATE'
  };
}
