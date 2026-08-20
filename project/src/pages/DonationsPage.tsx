import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Donation, FoodItem, DonationStatus, OrganizationType } from '@/types/database';
import {
  HeartHandshake, Plus, X, Loader2, AlertCircle, Trash2,
  Building, Phone, Calendar, Package, CheckCircle2, Truck, Clock, XCircle,
} from 'lucide-react';
import {
  donationStatusLabels, donationStatusColors, orgTypeLabels,
  formatDate, categoryLabels,
} from '@/lib/ui';

const orgTypes: OrganizationType[] = ['shelter', 'food_bank', 'charity', 'community'];
const statuses: DonationStatus[] = ['pending', 'scheduled', 'completed', 'cancelled'];

const statusIcons: Record<DonationStatus, typeof Clock> = {
  pending: Clock, scheduled: Truck, completed: CheckCircle2, cancelled: XCircle,
};

const emptyForm = {
  food_item_id: '' as string,
  organization_name: '',
  organization_type: 'food_bank' as OrganizationType,
  quantity_donated: 1,
  pickup_date: new Date().toISOString().slice(0, 10),
  contact_person: '',
  contact_phone: '',
  notes: '',
};

export default function DonationsPage() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<DonationStatus | 'all'>('all');

  async function load() {
    setLoading(true);
    const [{ data: dn }, { data: fi }] = await Promise.all([
      supabase.from('donations').select('*, food_items(name, category, unit)').order('created_at', { ascending: false }),
      supabase.from('food_items').select('*').order('expiry_date', { ascending: true }),
    ]);
    setDonations((dn ?? []) as Donation[]);
    setFoodItems((fi ?? []) as FoodItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Items available to donate (exclude already donated/expired)
  const donatable = foodItems.filter((i) => i.status !== 'donated' && i.status !== 'expired');

  function openForm() {
    setForm({ ...emptyForm, food_item_id: donatable[0]?.id ?? '' });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.organization_name.trim() || !form.contact_person.trim()) {
      setError('Organization and contact person are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('donations').insert({
        ...form,
        notes: form.notes || null,
        user_id: user?.id,
      });
      if (err) throw err;
      // Mark the food item as donated
      if (form.food_item_id) {
        await supabase.from('food_items').update({ status: 'donated' }).eq('id', form.food_item_id);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create donation.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: DonationStatus) {
    await supabase.from('donations').update({ status }).eq('id', id);
    setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this donation record?')) return;
    await supabase.from('donations').delete().eq('id', id);
    setDonations((prev) => prev.filter((d) => d.id !== id));
  }

  const filtered = donations.filter((d) => filterStatus === 'all' || d.status === filterStatus);

  const stats = {
    total: donations.length,
    completed: donations.filter((d) => d.status === 'completed').length,
    scheduled: donations.filter((d) => d.status === 'scheduled').length,
    meals: donations.reduce((s, d) => s + d.quantity_donated, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-rise-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900 flex items-center gap-2">
            <HeartHandshake size={28} className="text-cyan-500" />
            Donation Portal
          </h1>
          <p className="text-ink-500 mt-1">Connect surplus food with organizations that need it.</p>
        </div>
        <button
          onClick={openForm}
          disabled={donatable.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm shadow-md transition-colors self-start disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          New Donation
        </button>
      </div>

      {donatable.length === 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-rise-in">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>
            No items available to donate right now. Add food items to your inventory first, or mark expiring items for donation.
          </span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <MiniStat label="Total Donations" value={stats.total} icon={HeartHandshake} color="text-cyan-500" bg="bg-cyan-50" />
        <MiniStat label="Completed" value={stats.completed} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-50" />
        <MiniStat label="Scheduled" value={stats.scheduled} icon={Truck} color="text-sky-500" bg="bg-sky-50" />
        <MiniStat label="Items Donated" value={stats.meals} icon={Package} color="text-violet-500" bg="bg-violet-50" />
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 animate-rise-in">
        <FilterChip active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>All</FilterChip>
        {statuses.map((s) => (
          <FilterChip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>
            {donationStatusLabels[s]}
          </FilterChip>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-ink-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-ink-100 animate-rise-in">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-4">
            <HeartHandshake size={28} className="text-cyan-500" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-800">No donations yet</h3>
          <p className="text-ink-400 text-sm mt-1 mb-5">Create your first donation to start helping your community.</p>
          <button
            onClick={openForm}
            disabled={donatable.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            New Donation
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {filtered.map((d) => {
            const StatusIcon = statusIcons[d.status];
            return (
              <div
                key={d.id}
                className="group bg-white rounded-2xl p-5 shadow-card border border-ink-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Status icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${donationStatusColors[d.status]}`}>
                    <StatusIcon size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-ink-900">{d.organization_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${donationStatusColors[d.status]}`}>
                        {donationStatusLabels[d.status]}
                      </span>
                      <span className="text-xs text-ink-400">
                        {orgTypeLabels[d.organization_type].replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                      {d.food_items && (
                        <span className="flex items-center gap-1">
                          <Package size={12} />
                          {d.food_items.name}
                          {d.food_items.category && ` · ${categoryLabels[d.food_items.category]}`}
                        </span>
                      )}
                      <span>{d.quantity_donated} {d.food_items?.unit ?? 'units'}</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Pickup {formatDate(d.pickup_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building size={12} />
                        {d.contact_person}
                      </span>
                      {d.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {d.contact_phone}
                        </span>
                      )}
                    </div>
                    {d.notes && <p className="text-sm text-ink-400 mt-1 italic">{d.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center">
                    {d.status !== 'completed' && d.status !== 'cancelled' && (
                      <>
                        {d.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(d.id, 'scheduled')}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium transition-colors"
                          >
                            Schedule
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(d.id, 'completed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-colors"
                        >
                          Complete
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-ink-900">New Donation</h2>
              <button onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Food item</label>
                <select
                  value={form.food_item_id}
                  onChange={(e) => setForm({ ...form, food_item_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                >
                  <option value="">— Select an item —</option>
                  {donatable.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.quantity} {i.unit}, expires {formatDate(i.expiry_date)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Organization</label>
                  <input
                    type="text"
                    value={form.organization_name}
                    onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                    placeholder="e.g. Hope Food Bank"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Type</label>
                  <select
                    value={form.organization_type}
                    onChange={(e) => setForm({ ...form, organization_type: e.target.value as OrganizationType })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  >
                    {orgTypes.map((t) => (
                      <option key={t} value={t}>{orgTypeLabels[t].replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity_donated}
                    onChange={(e) => setForm({ ...form, quantity_donated: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Pickup date</label>
                  <input
                    type="date"
                    value={form.pickup_date}
                    onChange={(e) => setForm({ ...form, pickup_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Contact person</label>
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    placeholder="Name"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Contact phone</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any special instructions..."
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all resize-none"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-ink-100 hover:bg-ink-200 text-ink-700 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors disabled:opacity-70"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Create Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color, bg }: {
  label: string; value: number; icon: typeof HeartHandshake; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-ink-100">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-cyan-500 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-cyan-300'
      }`}
    >
      {children}
    </button>
  );
}
