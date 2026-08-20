import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { PredictionResponse, WastePrediction } from '@/types/database';
import {
  Brain, Loader2, Sparkles, TrendingUp, AlertTriangle, DollarSign,
  Target, Zap, ArrowRight,
} from 'lucide-react';
import {
  riskLabels, riskColors, riskBar, categoryLabels, formatDateTime,
} from '@/lib/ui';
import type { PageKey } from '@/components/DashboardLayout';

export default function PredictionsPage({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<WastePrediction[]>([]);
  const [summary, setSummary] = useState<PredictionResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  async function loadCached() {
    setLoading(true);
    const { data } = await supabase
      .from('waste_predictions')
      .select('*, food_items(name, category, quantity, unit)')
      .order('waste_risk_score', { ascending: false });
    const rows = (data ?? []) as unknown as WastePrediction[];
    setPredictions(rows);
    if (rows.length > 0) {
      const atRisk = rows.filter((p) => p.risk_level === 'high' || p.risk_level === 'critical').length;
      const avgRisk = Math.round(rows.reduce((s, p) => s + p.waste_risk_score, 0) / rows.length);
      const totalValueAtRisk = Math.round(rows.reduce((s, p) => s + p.estimated_value_at_risk, 0) * 100) / 100;
      setSummary({ total: rows.length, atRisk, avgRisk, totalValueAtRisk });
      setHasRun(true);
    }
    setLoading(false);
  }

  useEffect(() => { loadCached(); }, []);

  async function runPredictions() {
    setAnalyzing(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-waste`;
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = (await res.json()) as PredictionResponse;
      if (!body.predictions || !body.summary) {
        throw new Error('Received an unexpected response from the prediction service.');
      }
      setPredictions(body.predictions);
      setSummary(body.summary);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run predictions.');
    } finally {
      setAnalyzing(false);
    }
  }

  const summaryCards = summary ? [
    { label: 'Items Analyzed', value: summary.total, icon: Target, color: 'from-emerald-500 to-emerald-600' },
    { label: 'At Risk', value: summary.atRisk, icon: AlertTriangle, color: 'from-orange-500 to-red-500' },
    { label: 'Avg Risk Score', value: `${summary.avgRisk}`, icon: TrendingUp, color: 'from-cyan-500 to-sky-600' },
    { label: 'Value at Risk', value: `$${summary.totalValueAtRisk.toFixed(0)}`, icon: DollarSign, color: 'from-violet-500 to-purple-600' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-rise-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900 flex items-center gap-2">
            <Brain size={28} className="text-emerald-500" />
            AI Waste Predictions
          </h1>
          <p className="text-ink-500 mt-1">
            Our model scores every item by waste risk using expiry, category, and storage.
          </p>
        </div>
        <button
          onClick={runPredictions}
          disabled={analyzing}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:shadow-glow text-white font-semibold text-sm shadow-glow transition-all disabled:opacity-70 self-start"
        >
          {analyzing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap size={18} />
              Run AI Analysis
            </>
          )}
        </button>
      </div>

      {/* How it works banner */}
      {!hasRun && !loading && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 p-6 text-white animate-rise-in">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Ready when you are</h2>
              <p className="text-white/90 text-sm max-w-2xl">
                Add food items to your inventory, then click <strong>Run AI Analysis</strong>.
                The model evaluates expiry proximity, category perishability, storage conditions,
                and time-since-purchase to produce a risk score and a recommended action for each item.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-rise-in">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analyzing state */}
      {analyzing && (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
            <Brain size={28} className="absolute inset-0 m-auto text-emerald-500" />
          </div>
          <p className="font-display text-lg font-semibold text-ink-800">Analyzing inventory...</p>
          <p className="text-sm text-ink-400 mt-1">Scoring each item against the waste-risk model.</p>
        </div>
      )}

      {/* Summary cards */}
      {!analyzing && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {summaryCards.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-card border border-ink-100">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4`}>
                <s.icon size={20} className="text-white" />
              </div>
              <p className="font-display text-3xl font-bold text-ink-900">{s.value}</p>
              <p className="text-sm font-medium text-ink-700">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Predictions list */}
      {!analyzing && predictions.length > 0 && (
        <div className="space-y-3 stagger">
          <h2 className="font-display text-lg font-semibold text-ink-900 pt-2">
            Predictions by Risk
          </h2>
          {predictions.map((p) => {
            const foodName = p.food_items?.name ?? 'Unknown item';
            const foodCat = p.food_items?.category ?? 'other';
            const score = Math.round(p.waste_risk_score);
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 shadow-card border border-ink-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Score ring */}
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke={score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 35 ? '#f59e0b' : '#10b981'}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(score / 100) * 176} 176`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-sm text-ink-800">
                      {score}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-ink-900">{foodName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${riskColors[p.risk_level]}`}>
                        {riskLabels[p.risk_level]}
                      </span>
                      {p.food_items && (
                        <span className="text-xs text-ink-400">
                          {categoryLabels[foodCat]} · {p.food_items.quantity} {p.food_items.unit}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-600 mb-2">{p.recommended_action}</p>
                    <div className="flex items-center gap-4 text-xs text-ink-400">
                      <span>
                        {p.days_until_expiry < 0
                          ? `Expired ${Math.abs(p.days_until_expiry)}d ago`
                          : `${p.days_until_expiry} days until expiry`}
                      </span>
                      <span>${p.estimated_value_at_risk.toFixed(2)} at risk</span>
                      <span className="hidden sm:inline">Analyzed {formatDateTime(p.created_at)}</span>
                    </div>
                    {/* risk bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${riskBar[p.risk_level]} transition-all duration-700`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>

                  {p.risk_level !== 'low' && (
                    <button
                      onClick={() => onNavigate('donations')}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-sm font-medium transition-colors self-start sm:self-center whitespace-nowrap"
                    >
                      <ArrowRight size={14} />
                      Donate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!analyzing && !loading && predictions.length === 0 && !error && (
        <div className="bg-white rounded-2xl p-12 text-center border border-ink-100 animate-rise-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Brain size={28} className="text-emerald-500" />
          </div>
          <h3 className="font-display text-lg font-semibold text-ink-800">No predictions yet</h3>
          <p className="text-ink-400 text-sm mt-1 mb-5 max-w-sm mx-auto">
            {hasRun
              ? 'Run an analysis to see AI waste risk scores for your inventory.'
              : 'Add food items first, then run the AI analysis to see predictions here.'}
          </p>
          <button
            onClick={() => onNavigate('inventory')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-100 hover:bg-ink-200 text-ink-700 font-medium text-sm transition-colors"
          >
            Go to Inventory
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
