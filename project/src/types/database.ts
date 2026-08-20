export type FoodCategory = 'produce' | 'dairy' | 'bakery' | 'meat' | 'prepared' | 'other';
export type FoodUnit = 'kg' | 'units' | 'liters';
export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'shelf';
export type FoodStatus = 'fresh' | 'near_expiry' | 'expiring' | 'expired' | 'donated';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DonationStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';
export type OrganizationType = 'shelter' | 'food_bank' | 'charity' | 'community';
export type UserRole = 'admin' | 'manager' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface FoodItem {
  id: string;
  user_id: string;
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: FoodUnit;
  expiry_date: string;
  purchase_date: string;
  storage_location: StorageLocation;
  status: FoodStatus;
  created_at: string;
}

export interface WastePrediction {
  id: string;
  user_id: string;
  food_item_id: string;
  waste_risk_score: number;
  risk_level: RiskLevel;
  predicted_waste_probability: number;
  recommended_action: string;
  days_until_expiry: number;
  estimated_value_at_risk: number;
  created_at: string;
  food_items?: Pick<FoodItem, 'name' | 'category' | 'quantity' | 'unit'> | null;
}

export interface Donation {
  id: string;
  user_id: string;
  food_item_id: string | null;
  organization_name: string;
  organization_type: OrganizationType;
  quantity_donated: number;
  pickup_date: string;
  status: DonationStatus;
  contact_person: string;
  contact_phone: string;
  notes: string | null;
  created_at: string;
  food_items?: Pick<FoodItem, 'name' | 'category' | 'unit'> | null;
}

export interface PredictionSummary {
  total: number;
  atRisk: number;
  avgRisk: number;
  totalValueAtRisk: number;
}

export interface PredictionResponse {
  predictions: WastePrediction[];
  summary: PredictionSummary;
}

