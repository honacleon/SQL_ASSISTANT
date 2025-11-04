-- AI Data Assistant - Quick Setup SQL
-- Copie e cole todo este código no SQL Editor do Supabase

-- Table 1: Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'Brasil',
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  sku VARCHAR(50) UNIQUE NOT NULL,
  brand VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente',
  payment_method VARCHAR(50),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
INSERT INTO users (name, email, phone, city, state) VALUES
('João Silva', 'joao@email.com', '(11) 99999-0001', 'São Paulo', 'SP'),
('Maria Santos', 'maria@email.com', '(21) 99999-0002', 'Rio de Janeiro', 'RJ'),
('Pedro Oliveira', 'pedro@email.com', '(31) 99999-0003', 'Belo Horizonte', 'MG'),
('Ana Costa', 'ana@email.com', '(41) 99999-0004', 'Curitiba', 'PR'),
('Carlos Souza', 'carlos@email.com', '(51) 99999-0005', 'Porto Alegre', 'RS')
ON CONFLICT (email) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, category, price, stock_quantity, sku, brand) VALUES
('Smartphone Galaxy A54', 'Smartphone Samsung com 128GB', 'Eletrônicos', 1299.99, 50, 'GAL-A54-128', 'Samsung'),
('Notebook Dell Inspiron', 'Notebook Dell i5 8GB 256GB SSD', 'Eletrônicos', 2499.99, 25, 'DELL-INS-I5', 'Dell'),
('Smart TV LG 50"', 'Smart TV LG 50 polegadas 4K', 'Eletrônicos', 1899.99, 30, 'LG-TV-50-4K', 'LG'),
('Fone JBL Tune 500', 'Fone de ouvido JBL com fio', 'Acessórios', 99.99, 100, 'JBL-T500-BLK', 'JBL'),
('Mouse Logitech MX Master', 'Mouse sem fio Logitech profissional', 'Acessórios', 299.99, 75, 'LOG-MX-MST3', 'Logitech')
ON CONFLICT (sku) DO NOTHING;

-- Insert sample orders
INSERT INTO orders (user_id, total_amount, status, payment_method)
SELECT
  u.id,
  1299.99,
  'aprovado',
  'Cartão de Crédito'
FROM users u
WHERE u.email = 'joao@email.com'
LIMIT 1;

INSERT INTO orders (user_id, total_amount, status, payment_method)
SELECT
  u.id,
  2499.99,
  'entregue',
  'PIX'
FROM users u
WHERE u.email = 'maria@email.com'
LIMIT 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);