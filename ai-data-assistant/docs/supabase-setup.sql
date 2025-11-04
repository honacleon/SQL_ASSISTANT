-- AI Data Assistant - Supabase Database Setup
-- Execute these queries in your Supabase SQL editor

-- Table 1: Users (example customer data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'Brasil',
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Products (example product catalog)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  sku VARCHAR(50) UNIQUE NOT NULL,
  brand VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'descontinuado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Orders (example transaction data)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'cancelado', 'entregue')),
  payment_method VARCHAR(50),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delivery_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Order Items (order details)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: Analytics/Metrics (example analytics data)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  event_data JSONB,
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);

-- Insert sample data

-- Sample Users
INSERT INTO users (name, email, phone, city, state) VALUES
('João Silva', 'joao@email.com', '(11) 99999-0001', 'São Paulo', 'SP'),
('Maria Santos', 'maria@email.com', '(21) 99999-0002', 'Rio de Janeiro', 'RJ'),
('Pedro Oliveira', 'pedro@email.com', '(31) 99999-0003', 'Belo Horizonte', 'MG'),
('Ana Costa', 'ana@email.com', '(41) 99999-0004', 'Curitiba', 'PR'),
('Carlos Souza', 'carlos@email.com', '(51) 99999-0005', 'Porto Alegre', 'RS'),
('Lucia Ferreira', 'lucia@email.com', '(85) 99999-0006', 'Fortaleza', 'CE'),
('Roberto Lima', 'roberto@email.com', '(11) 99999-0007', 'São Paulo', 'SP'),
('Fernanda Rocha', 'fernanda@email.com', '(21) 99999-0008', 'Rio de Janeiro', 'RJ'),
('Marcos Alves', 'marcos@email.com', '(62) 99999-0009', 'Goiânia', 'GO'),
('Juliana Campos', 'juliana@email.com', '(47) 99999-0010', 'Florianópolis', 'SC')
ON CONFLICT (email) DO NOTHING;

-- Sample Products
INSERT INTO products (name, description, category, price, stock_quantity, sku, brand) VALUES
('Smartphone Galaxy A54', 'Smartphone Samsung com 128GB', 'Eletrônicos', 1299.99, 50, 'GAL-A54-128', 'Samsung'),
('Notebook Dell Inspiron', 'Notebook Dell i5 8GB 256GB SSD', 'Eletrônicos', 2499.99, 25, 'DELL-INS-I5', 'Dell'),
('Smart TV LG 50"', 'Smart TV LG 50 polegadas 4K', 'Eletrônicos', 1899.99, 30, 'LG-TV-50-4K', 'LG'),
('Fone JBL Tune 500', 'Fone de ouvido JBL com fio', 'Acessórios', 99.99, 100, 'JBL-T500-BLK', 'JBL'),
('Mouse Logitech MX Master', 'Mouse sem fio Logitech profissional', 'Acessórios', 299.99, 75, 'LOG-MX-MST3', 'Logitech'),
('Teclado Mecânico RGB', 'Teclado mecânico gamer RGB', 'Acessórios', 199.99, 60, 'KBD-MECH-RGB', 'Generic'),
('Monitor Dell 24"', 'Monitor Dell 24 polegadas Full HD', 'Eletrônicos', 599.99, 40, 'DELL-MON-24', 'Dell'),
('Webcam Logitech C920', 'Webcam Full HD 1080p', 'Acessórios', 149.99, 80, 'LOG-C920-HD', 'Logitech'),
('HD Externo 1TB', 'HD Externo portátil 1TB USB 3.0', 'Armazenamento', 199.99, 90, 'HD-EXT-1TB', 'Seagate'),
('Carregador Wireless', 'Carregador sem fio universal', 'Acessórios', 79.99, 120, 'CHG-WLESS-10W', 'Anker')
ON CONFLICT (sku) DO NOTHING;

-- Sample Orders (using actual user IDs from the inserted data)
WITH user_ids AS (
  SELECT id FROM users LIMIT 10
),
product_ids AS (
  SELECT id, price FROM products LIMIT 10
)
INSERT INTO orders (user_id, total_amount, status, payment_method, order_date)
SELECT
  u.id,
  ROUND((RANDOM() * 1000 + 100)::numeric, 2),
  CASE
    WHEN RANDOM() < 0.7 THEN 'aprovado'
    WHEN RANDOM() < 0.9 THEN 'entregue'
    ELSE 'cancelado'
  END,
  CASE
    WHEN RANDOM() < 0.5 THEN 'Cartão de Crédito'
    WHEN RANDOM() < 0.8 THEN 'PIX'
    ELSE 'Boleto'
  END,
  CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days')
FROM user_ids u, generate_series(1, 3) -- 3 orders per user
ON CONFLICT DO NOTHING;

-- Sample Order Items
WITH recent_orders AS (
  SELECT o.id as order_id, p.id as product_id, p.price
  FROM orders o
  CROSS JOIN products p
  WHERE RANDOM() < 0.3 -- 30% chance each product is in each order
  LIMIT 50
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
SELECT
  order_id,
  product_id,
  FLOOR(RANDOM() * 3 + 1)::integer as quantity,
  price as unit_price,
  (FLOOR(RANDOM() * 3 + 1) * price)::numeric(10,2) as total_price
FROM recent_orders
ON CONFLICT DO NOTHING;

-- Sample Analytics Events
WITH user_ids AS (
  SELECT id FROM users LIMIT 10
),
product_ids AS (
  SELECT id FROM products LIMIT 10
)
INSERT INTO analytics_events (event_type, user_id, product_id, event_data, session_id)
SELECT
  CASE
    WHEN RANDOM() < 0.3 THEN 'product_view'
    WHEN RANDOM() < 0.6 THEN 'add_to_cart'
    WHEN RANDOM() < 0.8 THEN 'purchase'
    ELSE 'search'
  END,
  (SELECT id FROM user_ids ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM product_ids ORDER BY RANDOM() LIMIT 1),
  jsonb_build_object(
    'source', CASE WHEN RANDOM() < 0.5 THEN 'web' ELSE 'mobile' END,
    'value', ROUND((RANDOM() * 100)::numeric, 2)
  ),
  'session_' || FLOOR(RANDOM() * 10000)
FROM generate_series(1, 200)
ON CONFLICT DO NOTHING;

-- Update orders total_amount based on order items
UPDATE orders
SET total_amount = (
  SELECT COALESCE(SUM(total_price), 0)
  FROM order_items
  WHERE order_items.order_id = orders.id
)
WHERE EXISTS (
  SELECT 1 FROM order_items WHERE order_items.order_id = orders.id
);

-- Create some useful views for common queries
CREATE OR REPLACE VIEW order_summary AS
SELECT
  o.id,
  o.order_date,
  u.name as customer_name,
  u.email as customer_email,
  o.status,
  o.total_amount,
  o.payment_method,
  COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_date, u.name, u.email, o.status, o.total_amount, o.payment_method;

CREATE OR REPLACE VIEW product_analytics AS
SELECT
  p.id,
  p.name,
  p.category,
  p.price,
  p.stock_quantity,
  COUNT(DISTINCT ae.id) as view_count,
  COUNT(DISTINCT oi.id) as order_count,
  COALESCE(SUM(oi.quantity), 0) as total_sold
FROM products p
LEFT JOIN analytics_events ae ON p.id = ae.product_id AND ae.event_type = 'product_view'
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name, p.category, p.price, p.stock_quantity;

-- Grant necessary permissions (adjust as needed)
-- These would be handled through Supabase dashboard RLS policies in production