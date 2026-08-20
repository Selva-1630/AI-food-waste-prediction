import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { FoodItem, Donation, WastePrediction } from '@/types/database';
import {
  Package, AlertTriangle, HeartHandshake, TrendingDown, DollarSign,
  Brain, ArrowRight, Sparkles,
} from 'lucide-react';
import {
  statusColors, statusLabels, riskColors, riskLabels,
  formatDate, daysUntil,
} from '@/lib/ui';
import type { PageKey } from '@/components/DashboardLayout';

export default function OverviewPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [predictions, setPredictions] = useState<WastePrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: fi }, { data: dn }, { data: wp }] = await Promise.all([
        supabase.from('food_items').select('*').order('expiry_date', { ascending: true }),
        supabase.from('donations').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('waste_predictions').select('*').order('waste_risk_score', { ascending: false }).limit(5),
      ]);
      setItems((fi ?? []) as FoodItem[]);
      setDonations((dn ?? []) as Donation[]);
      setPredictions((wp ?? []) as WastePrediction[]);
      setLoading(false);
    })();
  }, []);

  const totalItems = items.length;
  const expiringSoon = items.filter((i) => {
    const d = daysUntil(i.expiry_date);
    return d >= 0 && d <= 3;
  }).length;
  const expired = items.filter((i) => daysUntil(i.expiry_date) < 0).length;
  const totalDonations = donations.length;
  const mealsDonated = donations.reduce((s, d) => s + d.quantity_donated, 0);
  const criticalItems = predictions.filter((p) => p.risk_level === 'critical' || p.risk_level === 'high');
  const valueAtRisk = predictions.reduce((s, p) => s + p.estimated_value_at_risk, 0);

  const stats = [
    { label: 'Items Tracked', value: totalItems, icon: Package, color: 'from-emerald-500 to-emerald-600', sub: 'in inventory' },
    { label: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle, color: 'from-amber-500 to-orange-500', sub: 'within 3 days' },
    { label: 'Expired', value: expired, icon: TrendingDown, color: 'from-red-500 to-rose-600', sub: 'needs action' },
    { label: 'Meals Donated', value: mealsDonated, icon: HeartHandshake, color: 'from-cyan-500 to-sky-600', sub: `${totalDonations} donations` },
  ];

  const firstName = (profile?.full_name || '').split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-rise-in">
        <h1 className="font-display text-3xl font-bold text-ink-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-ink-500 mt-1">
          Here's what's happening in your food waste pipeline today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-5 shadow-card border border-ink-100 hover:shadow-lg transition-shadow"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4`}>
              <s.icon size={20} className="text-white" />
            </div>
            <p className="font-display text-3xl font-bold text-ink-900">{loading ? '—' : s.value}</p>
            <p className="text-sm font-medium text-ink-700">{s.label}</p>
            <p className="text-xs text-ink-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Value at risk banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ink-900 to-ink-800 p-6 sm:p-8 text-white animate-rise-in">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <DollarSign size={18} />
              <span className="text-xs uppercase tracking-wider font-medium">Estimated Value at Risk</span>
            </div>
            <p className="font-display text-4xl font-bold">
              ${valueAtRisk.toFixed(2)}
            </p>
            <p className="text-ink-300 text-sm mt-1">
              Based on {predictions.length} AI predictions across your inventory.
            </p>
          </div>
          <button
            onClick={() => onNavigate('predictions')}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm transition-colors self-start"
          >
            <Brain size={16} />
            View Predictions
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Critical items */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-ink-100 animate-rise-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-orange-500" />
              Needs Immediate Attention
            </h2>
            <button
              onClick={() => onNavigate('predictions')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              See all
            </button>
          </div>
          {criticalItems.length === 0 ? (
            <EmptyHint icon={Sparkles} text="No critical items. Run AI predictions to surface risks." />
          ) : (
            <ul className="space-y-3">
              {criticalItems.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${riskColors[p.risk_level]}`}>
                    {riskLabels[p.risk_level]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{p.recommended_action}</p>
                    <p className="text-xs text-ink-400">
                      {p.days_until_expiry < 0 ? 'Expired' : `${p.days_until_expiry}d left`} · ${p.estimated_value_at_risk.toFixed(2)} at risk
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent donations */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-ink-100 animate-rise-in animation-delay-200">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-semibold text-ink-900 flex items-center gap-2">
              <HeartHandshake size={18} className="text-cyan-500" />
              Recent Donations
            </h2>
            <button
              onClick={() => onNavigate('donations')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              See all
            </button>
          </div>
          {donations.length === 0 ? (
            <EmptyHint icon={HeartHandshake} text="No donations yet. Start donating surplus food." />
          ) : (
            <ul className="space-y-3">
              {donations.map((d) => (
                <li key={d.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                    <HeartHandshake size={16} className="text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{d.organization_name}</p>
                    <p className="text-xs text-ink-400">
                      {d.quantity_donated} units · pickup {formatDate(d.pickup_date)}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    d.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    d.status === 'scheduled' ? 'bg-sky-100 text-sky-700' :
                    d.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-ink-100 text-ink-600'
                  }`}>
                    {d.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Inventory snapshot */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-ink-100 animate-rise-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">Inventory Snapshot</h2>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Manage inventory
          </button>
        </div>
        {items.length === 0 ? (
          <EmptyHint icon={Package} text="Your inventory is empty. Add food items to start tracking." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-400 uppercase tracking-wider border-b border-ink-100">
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Expiry</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {items.slice(0, 6).map((it) => {
                  const d = daysUntil(it.expiry_date);
                  return (
                    <tr key={it.id} className="hover:bg-ink-50/50 transition-colors">
                      <td className="px-2 py-2.5 font-medium text-ink-800">{it.name}</td>
                      <td className="px-2 py-2.5 text-ink-600">{it.quantity} {it.unit}</td>
                      <td className="px-2 py-2.5 text-ink-600">
                        {formatDate(it.expiry_date)}
                        <span className={`ml-2 text-xs ${d < 0 ? 'text-red-500' : d <= 3 ? 'text-orange-500' : 'text-ink-400'}`}>
                          {d < 0 ? `(${Math.abs(d)}d ago)` : `(${d}d)`}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[it.status]}`}>
                          {statusLabels[it.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyHint({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mb-3">
        <Icon size={20} className="text-ink-400" />
      </div>
      <p className="text-sm text-ink-400 max-w-xs">{text}</p>
    </div>
  );
}
