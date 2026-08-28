CREATE TABLE reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (restaurant_id, reminder_date)
);
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminder_logs_select" ON reminder_logs FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);
