-- The profit calculator saves every input per user and product, including
-- the user's own fee and GST overrides.
ALTER TABLE cost_profiles
  ADD COLUMN product_gst_pct  numeric(4, 2),
  ADD COLUMN referral_fee_pct numeric(5, 2),
  ADD COLUMN closing_fee      numeric(12, 2);

-- One saved profile per user and product (product_id is required for it).
ALTER TABLE cost_profiles ALTER COLUMN product_id SET NOT NULL;
