export type ApiMode = 'demo' | 'live';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
  count?: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  location?: string;
  phone?: string;
}

export interface Harvest {
  id: string;
  harvestId?: string;
  crop: string;
  crop_type?: string;
  variety: string;
  quantityTonnes: number;
  quantity_quintals?: number;
  location: string;
  state?: string;
  district?: string;
  harvestDate: string;
  quality: string;
  qualityGrade?: string;
  moisturePercentage?: number;
  status: string;
  tone?: string;
}

export interface MarketPriceRecord {
  id: string;
  crop: string;
  crop_type: string;
  market_name: string;
  state: string;
  district: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  price_date: string;
  is_live_data: boolean;
  trend_30d?: string;
}

export interface WarehouseItem {
  id: string;
  warehouseId?: string;
  name: string;
  warehouseName?: string;
  facilityType: string;
  totalCapacityMt: number;
  availableCapacityMt: number;
  ratePerDayInr: number;
  state: string;
  district: string;
  location: string;
  isOperational: boolean;
  status?: string;
  score?: number;
}

export interface TransporterItem {
  id: string;
  transportId?: string;
  providerName: string;
  name: string;
  vehicleType: string;
  capacityKg: number;
  capacityTonnes: number;
  ratePerKm: number;
  baseFee: number;
  refrigerated: boolean;
  state: string;
  district: string;
  location: string;
  status: string;
  contactPhone?: string;
  contact_phone?: string;
  phone?: string;
  estimated_cost_inr?: number;
}

export interface BiomassItem {
  id: string;
  listingId?: string;
  cropType: string;
  residueType: string;
  quantityTons: number;
  pricePerTonInr: number;
  moisturePercentage: number;
  status: string;
  district: string;
  state: string;
  location: string;
  availabilityDate: string;
}

export interface IndustryBuyerItem {
  id: string;
  buyer_id?: string;
  company_name: string;
  buyer_type: string;
  target_crop_types: string[];
  max_procurement_volume_mt: number;
  state: string;
  district: string;
  contact_person: string;
  contact_phone: string;
  is_verified: boolean;
}

export interface BookingItem {
  id: string;
  booking_id?: string;
  bookingId?: string;
  title?: string;
  service_type: string;
  booking_type?: string;
  bookingType?: string;
  crop_type: string;
  quantity_units: number | string;
  quantity_kg?: number;
  quantityKg?: number;
  status: string;
  total_price_inr: number;
  estimatedCostInr?: number;
  formattedCost?: string;
  from_date?: string;
  to_date?: string;
  duration_days?: number;
  facility_name?: string;
  provider_name?: string;
  contact_phone?: string;
  service_date?: string;
  created_at: string;
  booking_date?: string;
  date?: string;
  tone?: string;
}

export interface AnalyticsOverview {
  kpis: {
    harvests_registered: string;
    harvests_count: number;
    expected_value_inr: string;
    expected_value_raw: number;
    decision_confidence: string;
    connected_partners: number;
    warehouses_active: number;
    transporters_active: number;
    buyers_active: number;
  };
  chart: {
    title: string;
    subtitle: string;
    labels: string[];
    baseline_series: number[];
    projected_series: number[];
  };
  top_recommendation: {
    action: string;
    crop: string;
    reasoning: string;
    net_upside_inr: number;
    confidence_pct: number;
  };
  recent_harvests: Harvest[];
  weather: {
    location: string;
    temp_c?: number;
    humidity_pct?: number;
    rain_risk?: string;
    advisory?: string;
  };
}

export interface DecisionEvaluationResult {
  harvest_id?: string;
  crop_type: string;
  quantity_quintals: number;
  current_modal_price_inr: number;
  forecast_modal_price_inr?: number;
  recommended_pathway: string;
  recommendations: Array<{
    pathway: string;
    label: string;
    estimated_net_return_inr: number;
    gross_revenue_inr: number;
    total_costs_inr: number;
    cost_breakdown: Record<string, number>;
    upside_vs_immediate_sale_inr: number;
    confidence_score: number;
    recommended: boolean;
    reasoning: string;
    risks: string[];
  }>;
}

export interface AiChatResponse {
  answer: string;
  model_used: string;
  source: string;
  status: string;
}

const rawBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

function getAuthHeader(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('agriconnect_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    console.warn(`[API Client Warning] Failed to reach ${url}:`, error.message);
    throw error;
  }
}

// 1. Auth API
export const authApi = {
  login: async (credentials: { email: string; password?: string }) => {
    return request<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  register: async (data: { full_name: string; email: string; password?: string; phone?: string; role?: string; district?: string; state?: string }) => {
    return request<ApiResponse<{ token: string; user: User }>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  me: async () => {
    return request<ApiResponse<User>>('/auth/me');
  },
};

// 2. Analytics API
export const analyticsApi = {
  getOverview: async () => {
    return request<ApiResponse<AnalyticsOverview>>('/analytics/overview');
  },
};

// 3. Harvests API
export const harvestApi = {
  list: async (params?: { crop?: string; crop_type?: string; state?: string; district?: string; search?: string; scope?: 'my' | 'all'; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.crop) q.set('crop', params.crop);
    if (params?.crop_type) q.set('crop_type', params.crop_type);
    if (params?.state) q.set('state', params.state);
    if (params?.district) q.set('district', params.district);
    if (params?.search) q.set('search', params.search);
    if (params?.scope) q.set('scope', params.scope);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<ApiResponse<Harvest[]> & { total?: number; page?: number; totalPages?: number; scope?: string }>(`/harvests?${q.toString()}`);
  },
  getById: async (id: string) => {
    return request<ApiResponse<Harvest>>(`/harvests/${id}`);
  },
  create: async (data: any) => {
    return request<ApiResponse<Harvest>>('/harvests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// 4. Market Intelligence API
export const marketApi = {
  overview: async () => {
    return request<ApiResponse<{
      meta: {
        total_price_records: number;
        verified_live_apmc_records: number;
        synthetic_demo_records: number;
        total_unique_crops: number;
      };
      benchmarks: MarketPriceRecord[];
      recent_live_mandi_quotes: any[];
    }>>('/markets/overview');
  },
  crops: async () => {
    return request<ApiResponse<string[]>>('/markets/crops');
  },
  prices: async (params?: { crop?: string; state?: string; district?: string; search?: string; is_live?: boolean; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.crop) q.set('crop', params.crop);
    if (params?.state) q.set('state', params.state);
    if (params?.district) q.set('district', params.district);
    if (params?.search) q.set('search', params.search);
    if (params?.is_live !== undefined) q.set('is_live', String(params.is_live));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return request<ApiResponse<MarketPriceRecord[]> & { total?: number; page?: number; totalPages?: number }>(`/markets/prices?${q.toString()}`);
  },
  forecast: async (data: { crop_type: string; state?: string; district?: string; horizon_days?: number }) => {
    return request<ApiResponse<{
      crop_type: string;
      market_name?: string;
      district?: string;
      state?: string;
      price_date?: string;
      current_price_inr_per_quintal: number;
      current_min_price_inr_per_quintal?: number;
      current_max_price_inr_per_quintal?: number;
      forecast_price_inr_per_quintal?: number;
      predicted_modal_price_inr_per_quintal?: number;
      predicted_min_price_inr_per_quintal?: number;
      predicted_max_price_inr_per_quintal?: number;
      expected_gain_inr_per_quintal?: number;
      predicted_change_percentage?: number;
      price_change_pct?: number;
      horizon_days?: number;
      forecast_horizon_days?: number;
      model_type?: string;
      evaluation_metrics?: { test_mae_inr?: number; accuracy_improvement_vs_baseline_pct?: number };
      is_synthetic_training_data?: boolean;
      confidence_score?: number;
      price_band?: { min: number; modal: number; max: number };
      current_band?: { min: number; modal: number; max: number };
      mandi_details?: { market: string; district: string; state: string; date: string };
      disclaimer?: string;
    }>>('/markets/forecast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// 5. Decision Intelligence API
export const recommendationsApi = {
  list: async (params?: { limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set('limit', String(params.limit));
    return request<ApiResponse<any[]>>(`/decisions?${q.toString()}`);
  },
  evaluate: async (harvestData: {
    crop_type: string;
    quantity_quintals: number;
    current_modal_price_inr?: number;
    state?: string;
    district?: string;
    storage_duration_days?: number;
    has_biomass?: boolean;
    biomass_type?: string;
  }) => {
    return request<ApiResponse<DecisionEvaluationResult>>('/decisions/evaluate', {
      method: 'POST',
      body: JSON.stringify(harvestData),
    });
  },
};

// 6. Warehouses API
export const warehouseApi = {
  list: async (params?: { facility_type?: string; state?: string; district?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.facility_type) q.set('facility_type', params.facility_type);
    if (params?.state) q.set('state', params.state);
    if (params?.district) q.set('district', params.district);
    if (params?.limit) q.set('limit', String(params.limit || 20));
    return request<ApiResponse<WarehouseItem[]>>(`/warehouses?${q.toString()}`);
  },
  recommend: async (data: { quantity_mt?: number; state?: string; district?: string; max_distance_km?: number }) => {
    return request<ApiResponse<{
      origin: { state: string; district: string };
      quantity_mt: number;
      ranked_warehouses: any[];
    }>>('/warehouses/recommend', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// 7. Logistics & Transport API
export const logisticsApi = {
  list: async (params?: { vehicle_type?: string; state?: string; district?: string; refrigerated?: boolean; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.vehicle_type) q.set('vehicle_type', params.vehicle_type);
    if (params?.state) q.set('state', params.state);
    if (params?.district) q.set('district', params.district);
    if (params?.refrigerated !== undefined) q.set('refrigerated', String(params.refrigerated));
    if (params?.limit) q.set('limit', String(params.limit || 20));
    return request<ApiResponse<TransporterItem[]>>(`/logistics?${q.toString()}`);
  },
  quote: async (data: {
    quantity_kg: number;
    distance_km?: number;
    state?: string;
    district?: string;
    perishable?: boolean;
  }) => {
    return request<ApiResponse<{
      route: { distance_km: number; duration_minutes: number; source: string };
      ranked_transporters: any[];
    }>>('/logistics/quote', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// 8. Biomass Marketplace API
export const biomassApi = {
  list: async (params?: { residue_type?: string; state?: string; district?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.residue_type) q.set('residue_type', params.residue_type);
    if (params?.state) q.set('state', params.state);
    if (params?.district) q.set('district', params.district);
    if (params?.limit) q.set('limit', String(params.limit || 20));
    return request<ApiResponse<BiomassItem[]>>(`/biomass?${q.toString()}`);
  },
  create: async (data: any) => {
    return request<ApiResponse<BiomassItem>>('/biomass', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  match: async (listingId: string, maxDistanceKm: number = 80) => {
    return request<ApiResponse<{
      listing: any;
      matched_buyers: any[];
      best_match: any;
    }>>('/biomass/match', {
      method: 'POST',
      body: JSON.stringify({ listing_id: listingId, max_distance_km: maxDistanceKm }),
    });
  },
};

// 9. Industry Buyers API
export const buyersApi = {
  list: async (params?: { crop_type?: string; state?: string; district?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.crop_type) q.set('crop_type', params.crop_type);
    if (params?.state) q.set('state', params.state);
    if (params?.district) q.set('district', params.district);
    if (params?.limit) q.set('limit', String(params.limit || 20));
    return request<ApiResponse<IndustryBuyerItem[]>>(`/buyers?${q.toString()}`);
  },
};

// 10. Bookings API
export const bookingsApi = {
  list: async () => {
    return request<ApiResponse<BookingItem[]>>('/bookings');
  },
  create: async (data: any) => {
    return request<ApiResponse<BookingItem>>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// 11. AI Assistant & Weather API
export const aiApi = {
  chat: async (data: { prompt: string; harvest_id?: string; crop_type?: string; location?: string }) => {
    return request<ApiResponse<AiChatResponse>>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  weather: async (coords?: { lat: number; lng: number }) => {
    const lat = coords?.lat ?? 29.6857;
    const lng = coords?.lng ?? 76.9905;
    return request<ApiResponse<any>>(`/ai/weather?lat=${lat}&lng=${lng}`);
  },
};
