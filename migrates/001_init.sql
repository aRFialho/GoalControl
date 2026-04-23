CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('OUTLET', 'RELAUNCH')),
  image_url TEXT NOT NULL,
  name TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_type ON products (type);

CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_product ON sales (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at DESC);

CREATE TABLE IF NOT EXISTS goals (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  monthly_goal INTEGER NOT NULL DEFAULT 0 CHECK (monthly_goal >= 0),
  weekly_goal INTEGER NOT NULL DEFAULT 0 CHECK (weekly_goal >= 0),
  biweekly_goal INTEGER NOT NULL DEFAULT 0 CHECK (biweekly_goal >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO goals (id, monthly_goal, weekly_goal, biweekly_goal)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

