CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    operating_days TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_select" ON restaurants FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "restaurants_insert" ON restaurants FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "restaurants_update" ON restaurants FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "restaurants_delete" ON restaurants FOR DELETE USING (owner_id = auth.uid());

CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    selling_price NUMERIC NOT NULL,
    hpp NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menus_select" ON menus FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "menus_insert" ON menus FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "menus_update" ON menus FOR UPDATE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "menus_delete" ON menus FOR DELETE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

CREATE TABLE daily_production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    production_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (menu_id, production_date)
);
ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_production_select" ON daily_production FOR SELECT USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "daily_production_insert" ON daily_production FOR INSERT WITH CHECK (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "daily_production_update" ON daily_production FOR UPDATE USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "daily_production_delete" ON daily_production FOR DELETE USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);

CREATE TABLE daily_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    sales_date DATE NOT NULL,
    quantity_sold INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (menu_id, sales_date)
);
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_sales_select" ON daily_sales FOR SELECT USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "daily_sales_insert" ON daily_sales FOR INSERT WITH CHECK (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "daily_sales_update" ON daily_sales FOR UPDATE USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "daily_sales_delete" ON daily_sales FOR DELETE USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);

CREATE TABLE forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    forecasted_demand INTEGER NOT NULL,
    recommended_production INTEGER NOT NULL,
    model_used TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (menu_id, target_date)
);
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forecasts_select" ON forecasts FOR SELECT USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "forecasts_insert" ON forecasts FOR INSERT WITH CHECK (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "forecasts_update" ON forecasts FOR UPDATE USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "forecasts_delete" ON forecasts FOR DELETE USING (
    menu_id IN (SELECT id FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);

CREATE TABLE model_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    last_trained TIMESTAMPTZ,
    hyperparameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE model_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_metadata_select" ON model_metadata FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "model_metadata_insert" ON model_metadata FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "model_metadata_update" ON model_metadata FOR UPDATE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "model_metadata_delete" ON model_metadata FOR DELETE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

CREATE TABLE model_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES model_metadata(id) ON DELETE CASCADE,
    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mae NUMERIC,
    mape NUMERIC,
    details JSONB
);
ALTER TABLE model_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "model_evaluations_select" ON model_evaluations FOR SELECT USING (
    model_id IN (SELECT id FROM model_metadata WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "model_evaluations_insert" ON model_evaluations FOR INSERT WITH CHECK (
    model_id IN (SELECT id FROM model_metadata WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "model_evaluations_update" ON model_evaluations FOR UPDATE USING (
    model_id IN (SELECT id FROM model_metadata WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);
CREATE POLICY "model_evaluations_delete" ON model_evaluations FOR DELETE USING (
    model_id IN (SELECT id FROM model_metadata WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()))
);

CREATE TABLE weather_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location TEXT NOT NULL,
    record_date DATE NOT NULL,
    temperature NUMERIC,
    rainfall NUMERIC,
    weather_category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (location, record_date)
);
ALTER TABLE weather_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weather_records_select" ON weather_records FOR SELECT USING (true);

CREATE TABLE surplus_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    distribution_date DATE NOT NULL,
    status TEXT NOT NULL,
    partner_name TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE surplus_distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surplus_distributions_select" ON surplus_distributions FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "surplus_distributions_insert" ON surplus_distributions FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "surplus_distributions_update" ON surplus_distributions FOR UPDATE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
CREATE POLICY "surplus_distributions_delete" ON surplus_distributions FOR DELETE USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
