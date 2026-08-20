import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { FoodItem, FoodCategory, FoodUnit, StorageLocation } from '@/types/database';
import {
  Package, Plus, Search, Trash2, X, Loader2, AlertCircle, Pencil,
  Apple, Carrot, Milk, Beef, Wheat, Cookie, Package2,
} from 'lucide-react';
import { categoryLabels, statusColors, statusLabels, formatDate, daysUntil } from '@/lib/ui';

const categories: FoodCategory[] = ['produce', 'dairy', 'bakery', 'meat', 'prepared', 'other'];
const units: FoodUnit[] = ['kg', 'units', 'liters'];
const locations: StorageLocation[] = ['fridge', 'freezer', 'pantry', 'shelf'];

const categoryIcons: Record<FoodCategory, typeof Apple> = {
  produce: Apple, dairy: Milk, bakery: Wheat, meat: Beef, prepared: Cookie, other: Package2,
};

const emptyForm = {
  name: '', category: 'produce' as FoodCategory, quantity: 1, unit: 'kg' as FoodUnit,
  expiry_date: '', purchase_date: new Date().toISOString().slice(0, 10),
  storage_location: 'fridge' as StorageLocation,
};

export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterCat, setFilterCat] = useState<FoodCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('food_items').select('*').order('expiry_date', { ascending: true });
    setItems((data ?? []) as FoodItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function openEdit(item: FoodItem) {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      expiry_date: item.expiry_date,
      purchase_date: item.purchase_date,
      storage_location: item.storage_location,
    });
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.expiry_date) {
      setError('Name and expiry date are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { error: err } = await supabase.from('food_items').update(form).eq('id', editing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('food_items').insert({ ...form, user_id: user?.id });
        if (err) throw err;
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this food item? This cannot be undone.')) return;
    await supabase.from('food_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = items.filter((i) => {
    const matchesQuery = i.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = filterCat === 'all' || i.category === filterCat;
    return matchesQuery && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-rise-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Food Inventory</h1>
          <p className="text-ink-500 mt-1">Track and manage all food items in your workspace.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm shadow-glow transition-colors self-start"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-rise-in">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>All</FilterChip>
          {categories.map((c) => (
            <FilterChip key={c} active={filterCat === c} onClick={() => setFilterCat(c)}>
              {categoryLabels[c]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-ink-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-ink-100 animate-rise-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-emerald-500" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-800">No items yet</h3>
          <p className="text-ink-400 text-sm mt-1 mb-5">Add your first food item to start tracking waste.</p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors"
          >
            <Plus size={18} />
            Add Item
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {filtered.map((item) => {
            const Icon = categoryIcons[item.category];
            const d = daysUntil(item.expiry_date);
            return (
              <div
                key={item.id}
                className="group bg-white rounded-2xl p-5 shadow-card border border-ink-100 hover:shadow-lg hover:border-emerald-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                    <Icon size={20} className="text-emerald-600" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(item)}
                      className="w-8 h-8 rounded-lg bg-ink-50 hover:bg-ink-100 text-ink-500 flex items-center justify-center transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-ink-900">{item.name}</h3>
                <p className="text-xs text-ink-400 mb-3">{categoryLabels[item.category]}</p>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-ink-600">{item.quantity} {item.unit}</span>
                  <span className="text-ink-500 capitalize">{item.storage_location}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-ink-50">
                  <div>
                    <p className="text-xs text-ink-400">Expires</p>
                    <p className={`text-sm font-medium ${d < 0 ? 'text-red-600' : d <= 3 ? 'text-orange-600' : 'text-ink-700'}`}>
                      {formatDate(item.expiry_date)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                    {statusLabels[item.status]}
                  </span>
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
              <h2 className="font-display text-xl font-bold text-ink-900">
                {editing ? 'Edit Item' : 'Add Food Item'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Item name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Fresh Tomatoes"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as FoodCategory })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  >
                    {categories.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Storage</label>
                  <select
                    value={form.storage_location}
                    onChange={(e) => setForm({ ...form, storage_location: e.target.value as StorageLocation })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm capitalize focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  >
                    {locations.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value as FoodUnit })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  >
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Purchase date</label>
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">Expiry date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-50 border border-ink-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  />
                </div>
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition-colors disabled:opacity-70"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : (editing ? 'Save Changes' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-emerald-500 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-emerald-300'
      }`}
    >
      {children}
    </button>
  );
}
