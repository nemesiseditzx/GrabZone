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

CREATE INDEX IF NOT EXISTS vendor_order_items_vendor_order_idx
  ON vendor_order_items(vendor_order_id);

CREATE INDEX IF NOT EXISTS vendor_order_items_order_item_idx
  ON vendor_order_items(order_item_id);

CREATE INDEX IF NOT EXISTS vendor_orders_order_vendor_idx
  ON vendor_orders(order_id, vendor_id);

CREATE INDEX IF NOT EXISTS shipments_order_vendor_created_idx
  ON shipments(order_id, vendor_id, created_at);

CREATE INDEX IF NOT EXISTS order_items_order_idx
  ON order_items(order_id);

PRAGMA optimize;
