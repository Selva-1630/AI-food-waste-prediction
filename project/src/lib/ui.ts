import type {
  FoodCategory, FoodStatus, RiskLevel, DonationStatus, OrganizationType,
} from '@/types/database';

export const categoryLabels: Record<FoodCategory, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  bakery: 'Bakery',
  meat: 'Meat',
  prepared: 'Prepared',
  other: 'Other',
};

export const categoryColors: Record<FoodCategory, string> = {
  produce: 'bg-emerald-100 text-emerald-700',
  dairy: 'bg-sky-100 text-sky-700',
  bakery: 'bg-amber-100 text-amber-700',
  meat: 'bg-rose-100 text-rose-700',
  prepared: 'bg-violet-100 text-violet-700',
  other: 'bg-ink-100 text-ink-600',
};

export const statusLabels: Record<FoodStatus, string> = {
  fresh: 'Fresh',
  near_expiry: 'Near Expiry',
  expiring: 'Expiring',
  expired: 'Expired',
  donated: 'Donated',
};

export const statusColors: Record<FoodStatus, string> = {
  fresh: 'bg-emerald-100 text-emerald-700',
  near_expiry: 'bg-amber-100 text-amber-700',
  expiring: 'bg-orange-100 text-orange-700',
  expired: 'bg-red-100 text-red-700',
  donated: 'bg-cyan-100 text-cyan-700',
};

export const riskLabels: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical',
};

export const riskColors: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export const riskBar: Record<RiskLevel, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export const donationStatusLabels: Record<DonationStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const donationStatusColors: Record<DonationStatus, string> = {
  pending: 'bg-ink-100 text-ink-600',
  scheduled: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const orgTypeLabels: Record<OrganizationType, string> = {
  shelter: 'Shelter',
  food_bank: 'Food Bank',
  charity: 'Charity',
  community: 'Community',
};

export function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
