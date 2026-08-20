import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FoodItemRow {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  purchase_date: string;
  storage_location: string;
  status: string;
}

/**
 * Heuristic waste-risk model.
 * Combines: days until expiry, category perishability, storage conditions,
 * and time-since-purchase to produce a risk score (0-100) and probability.
 * This mirrors a production ML model but runs deterministically on the edge.
 */
function predictWasteRisk(item: FoodItemRow, now: Date): {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  probability: number;
  action: string;
  daysUntilExpiry: number;
} {
  const expiry = new Date(item.expiry_date);
  const purchase = new Date(item.purchase_date);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysSincePurchase = Math.ceil((now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));

  // Category perishability multiplier (0-1)
  const perishability: Record<string, number> = {
    produce: 0.9,
    dairy: 0.85,
    meat: 0.95,
    bakery: 0.7,
    prepared: 0.8,
    other: 0.5,
  };
  const catFactor = perishability[item.category] ?? 0.5;

  // Storage factor — better storage extends effective life
  const storageFactor: Record<string, number> = {
    freezer: 0.3,
    fridge: 0.6,
    pantry: 0.75,
    shelf: 0.85,
  };
  const storeFactor = storageFactor[item.storage_location] ?? 0.75;

  // Base risk from days until expiry (exponential as it nears/passes expiry)
  let expiryRisk: number;
  if (daysUntilExpiry < 0) {
    expiryRisk = 100; // already expired
  } else if (daysUntilExpiry === 0) {
    expiryRisk = 95;
  } else if (daysUntilExpiry <= 1) {
    expiryRisk = 85;
  } else if (daysUntilExpiry <= 3) {
    expiryRisk = 70 - (daysUntilExpiry - 1) * 10;
  } else if (daysUntilExpiry <= 7) {
    expiryRisk = 45 - (daysUntilExpiry - 3) * 5;
  } else {
    expiryRisk = Math.max(5, 25 - (daysUntilExpiry - 7));
  }

  // Time-since-purchase degradation adds risk for items held long
  const ageRisk = Math.min(20, daysSincePurchase * 1.5);

  // Composite score, weighted by category and storage
  const rawScore = expiryRisk * 0.6 + ageRisk * 0.15 + catFactor * 30 * storeFactor;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  const probability = Math.min(1, Math.max(0, score / 100));

  let level: "low" | "medium" | "high" | "critical";
  if (score >= 80) level = "critical";
  else if (score >= 60) level = "high";
  else if (score >= 35) level = "medium";
  else level = "low";

  let action: string;
  if (daysUntilExpiry < 0) {
    action = "Item has expired. Dispose safely or compost. Consider donating earlier next cycle.";
  } else if (daysUntilExpiry <= 1) {
    action = "Use immediately or donate today. High-priority for donation pickup.";
  } else if (daysUntilExpiry <= 3) {
    action = "Prioritize use in meals or schedule donation within 24 hours.";
  } else if (daysUntilExpiry <= 7) {
    action = "Plan to use this week or list for donation. Monitor daily.";
  } else {
    action = "Store properly and monitor. No immediate action required.";
  }

  return { score, level, probability, action, daysUntilExpiry };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user from the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();

    // Fetch all of the user's food items
    const { data: items, error: itemsError } = await supabase
      .from("food_items")
      .select("id, name, category, quantity, unit, expiry_date, purchase_date, storage_location, status")
      .eq("user_id", user.id);

    if (itemsError) {
      return new Response(JSON.stringify({ error: itemsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const foodItems = (items ?? []) as FoodItemRow[];
    if (foodItems.length === 0) {
      return new Response(
        JSON.stringify({ predictions: [], summary: { total: 0, atRisk: 0, avgRisk: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear old predictions for this user, then recompute fresh
    await supabase.from("waste_predictions").delete().eq("user_id", user.id);

    const predictions: Array<{
      food_item_id: string;
      waste_risk_score: number;
      risk_level: string;
      predicted_waste_probability: number;
      recommended_action: string;
      days_until_expiry: number;
      estimated_value_at_risk: number;
    }> = [];

    for (const item of foodItems) {
      const pred = predictWasteRisk(item, now);
      // Rough value estimate per item based on category average value/kg
      const avgValue: Record<string, number> = {
        produce: 3, dairy: 4, meat: 12, bakery: 5, prepared: 8, other: 4,
      };
      const estimatedValueAtRisk = Math.round(
        (avgValue[item.category] ?? 4) * item.quantity * pred.probability * 100
      ) / 100;

      predictions.push({
        food_item_id: item.id,
        waste_risk_score: pred.score,
        risk_level: pred.level,
        predicted_waste_probability: pred.probability,
        recommended_action: pred.action,
        days_until_expiry: pred.daysUntilExpiry,
        estimated_value_at_risk: estimatedValueAtRisk,
      });

      // Update food item status based on prediction
      let newStatus = item.status;
      if (pred.daysUntilExpiry < 0) newStatus = "expired";
      else if (pred.daysUntilExpiry <= 1) newStatus = "expiring";
      else if (pred.daysUntilExpiry <= 3) newStatus = "near_expiry";

      if (newStatus !== item.status) {
        await supabase.from("food_items").update({ status: newStatus }).eq("id", item.id);
      }
    }

    // Batch insert predictions
    const { error: insertError } = await supabase.from("waste_predictions").insert(
      predictions.map((p) => ({ ...p, user_id: user.id }))
    );
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build summary
    const atRisk = predictions.filter((p) => p.risk_level === "high" || p.risk_level === "critical").length;
    const avgRisk = predictions.length > 0
      ? Math.round(predictions.reduce((s, p) => s + p.waste_risk_score, 0) / predictions.length)
      : 0;
    const totalValueAtRisk = Math.round(
      predictions.reduce((s, p) => s + p.estimated_value_at_risk, 0) * 100
    ) / 100;

    // Fetch predictions joined with food item details for the response
    const { data: enriched } = await supabase
      .from("waste_predictions")
      .select("id, food_item_id, waste_risk_score, risk_level, predicted_waste_probability, recommended_action, days_until_expiry, estimated_value_at_risk, created_at, food_items(name, category, quantity, unit)")
      .eq("user_id", user.id)
      .order("waste_risk_score", { ascending: false });

    return new Response(
      JSON.stringify({
        predictions: enriched ?? [],
        summary: {
          total: predictions.length,
          atRisk,
          avgRisk,
          totalValueAtRisk,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
