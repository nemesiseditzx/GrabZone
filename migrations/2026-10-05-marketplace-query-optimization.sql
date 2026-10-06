-- GrabZone marketplace query optimization
-- Confirmed by read-only D1 query-plan investigation.
CREATE INDEX IF NOT EXISTS option_values_option_idx
  ON option_values(option_id, sort_order, id);

CREATE INDEX IF NOT EXISTS product_options_product_idx
  ON product_options(product_id, sort_order, id);

CREATE INDEX IF NOT EXISTS variation_images_variation_idx
  ON variation_images(variation_id, sort_order, id);

CREATE INDEX IF NOT EXISTS product_variations_product_status_idx
  ON product_variations(product_id, status);

PRAGMA optimize;
