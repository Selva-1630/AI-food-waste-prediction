/*
# Food Waste Prediction & Donation Portal - Schema

1. New Tables
- `profiles` — extends auth.users with company-level info (role, company_name, full_name, avatar_url).
  - id (uuid, PK, FK to auth.users)
  - email (text)
  - full_name (text)
  - company_name (text) — company-level identifier
  - role (text: 'admin' | 'manager' | 'staff')
  - avatar_url (text, nullable)
  - created_at (timestamptz)

- `food_items` — inventory tracked by a company/user.
  - id (uuid, PK)
  - user_id (uuid, FK auth.users, DEFAULT auth.uid())
  - name (text)
  - category (text: produce, dairy, bakery, meat, prepared, other)
  - quantity (int)
  - unit (text: kg, units, liters)
  - expiry_date (date) — when the item expires
  - purchase_date (date)
  - storage_location (text: fridge, freezer, pantry, shelf)
  - status (text: fresh, near_expiry, expiring, expired, donated)
  - created_at (timestamptz)

- `waste_predictions` — AI-generated predictions about waste risk.
  - id (uuid, PK)
  - user_id (uuid, FK auth.users, DEFAULT auth.uid())
  - food_item_id (uuid, FK food_items ON DELETE CASCADE)
  - waste_risk_score (numeric 0-100)
  - risk_level (text: low, medium, high, critical)
  - predicted_waste_probability (numeric 0-1)
  - recommended_action (text)
  - days_until_expiry (int)
  - estimated_value_at_risk (numeric)
  - created_at (timestamptz)

- `donations` — records of food donated to organizations.
  - id (uuid, PK)
  - user_id (uuid, FK auth.users, DEFAULT auth.uid())
  - food_item_id (uuid, FK food_items ON DELETE SET NULL)
  - organization_name (text)
  - organization_type (text: shelter, food_bank, charity, community)
  - quantity_donated (int)
  - pickup_date (date)
  - status (text: pending, scheduled, completed, cancelled)
  - contact_person (text)
  - contact_phone (text)
  - notes (text, nullable)
  - created_at (timestamptz)

2. Security
- Enable RLS on every table.
- Owner-scoped CRUD: authenticated users can only access their own rows (user_id = auth.uid()).
- SELECT on profiles limited to own profile.
- All owner columns default to auth.uid() so inserts that omit user_id succeed.
3. Indexes
- food_items(user_id), waste_predictions(user_id), donations(user_id), food_items(expiry_date)
4. Notes
- Company-level isolation is achieved via user_id ownership: each authenticated user's data is isolated.
- The food_items.status column is updated by the app based on expiry proximity.
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Food items table
CREATE TABLE IF NOT EXISTS food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('produce','dairy','bakery','meat','prepared','other')),
  quantity int NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'units' CHECK (unit IN ('kg','units','liters')),
  expiry_date date NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  storage_location text NOT NULL DEFAULT 'pantry' CHECK (storage_location IN ('fridge','freezer','pantry','shelf')),
  status text NOT NULL DEFAULT 'fresh' CHECK (status IN ('fresh','near_expiry','expiring','expired','donated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_food_items" ON food_items;
CREATE POLICY "select_own_food_items" ON food_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_food_items" ON food_items;
CREATE POLICY "insert_own_food_items" ON food_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_food_items" ON food_items;
CREATE POLICY "update_own_food_items" ON food_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_food_items" ON food_items;
CREATE POLICY "delete_own_food_items" ON food_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Waste predictions table
CREATE TABLE IF NOT EXISTS waste_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id uuid NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  waste_risk_score numeric NOT NULL DEFAULT 0 CHECK (waste_risk_score >= 0 AND waste_risk_score <= 100),
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  predicted_waste_probability numeric NOT NULL DEFAULT 0 CHECK (predicted_waste_probability >= 0 AND predicted_waste_probability <= 1),
  recommended_action text NOT NULL DEFAULT '',
  days_until_expiry int NOT NULL DEFAULT 0,
  estimated_value_at_risk numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waste_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_predictions" ON waste_predictions;
CREATE POLICY "select_own_predictions" ON waste_predictions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_predictions" ON waste_predictions;
CREATE POLICY "insert_own_predictions" ON waste_predictions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_predictions" ON waste_predictions;
CREATE POLICY "delete_own_predictions" ON waste_predictions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id uuid REFERENCES food_items(id) ON DELETE SET NULL,
  organization_name text NOT NULL,
  organization_type text NOT NULL DEFAULT 'charity' CHECK (organization_type IN ('shelter','food_bank','charity','community')),
  quantity_donated int NOT NULL DEFAULT 1 CHECK (quantity_donated > 0),
  pickup_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','completed','cancelled')),
  contact_person text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_donations" ON donations;
CREATE POLICY "select_own_donations" ON donations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_donations" ON donations;
CREATE POLICY "insert_own_donations" ON donations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_donations" ON donations;
CREATE POLICY "update_own_donations" ON donations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_donations" ON donations;
CREATE POLICY "delete_own_donations" ON donations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_food_items_user_id ON food_items(user_id);
CREATE INDEX IF NOT EXISTS idx_food_items_expiry ON food_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_waste_predictions_user_id ON waste_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);

-- Trigger to auto-create a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow the trigger to run: grant execute to authenticated + anon
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon;