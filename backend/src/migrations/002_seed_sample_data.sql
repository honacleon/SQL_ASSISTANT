-- =============================================
-- SQL para popular tabelas com dados de teste
-- Execute no Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. CUSTOMERS (mais 17 registros para total de 20)
-- Colunas: id, name, email, status, created_at
-- =============================================
INSERT INTO customers (name, email, status) VALUES
-- Clientes ativos (10)
('David Silva', 'david.silva@example.com', 'active'),
('Emma Santos', 'emma.santos@example.com', 'active'),
('Felipe Costa', 'felipe.costa@example.com', 'active'),
('Gabriela Lima', 'gabriela.lima@example.com', 'active'),
('Henrique Oliveira', 'henrique.oliveira@example.com', 'active'),
('Isabela Mendes', 'isabela.mendes@example.com', 'active'),
('João Pereira', 'joao.pereira@example.com', 'active'),
('Karen Rodrigues', 'karen.rodrigues@example.com', 'active'),
('Lucas Almeida', 'lucas.almeida@example.com', 'active'),
('Maria Souza', 'maria.souza@example.com', 'active'),
-- Clientes inativos (5)
('Nicolas Ferreira', 'nicolas.ferreira@example.com', 'inactive'),
('Olivia Barbosa', 'olivia.barbosa@example.com', 'inactive'),
('Pedro Cardoso', 'pedro.cardoso@example.com', 'inactive'),
('Rafaela Gomes', 'rafaela.gomes@example.com', 'inactive'),
('Samuel Martins', 'samuel.martins@example.com', 'inactive'),
-- Clientes pendentes (2)
('Tatiana Ribeiro', 'tatiana.ribeiro@example.com', 'pending'),
('Victor Nascimento', 'victor.nascimento@example.com', 'pending');

-- =============================================
-- 2. ORDERS (20 pedidos com diferentes status e valores)
-- Colunas: id, customer_id, total_cents (int4), status, created_at
-- =============================================

INSERT INTO orders (customer_id, status, total_cents, created_at)
SELECT 
  id, 
  'completed', 
  (RANDOM() * 50000 + 5000)::int,  -- 50 a 500 reais em centavos
  NOW() - (RANDOM() * 30 || ' days')::interval
FROM customers 
WHERE status = 'active'
LIMIT 8;

INSERT INTO orders (customer_id, status, total_cents, created_at)
SELECT 
  id, 
  'pending', 
  (RANDOM() * 30000 + 3000)::int,  -- 30 a 300 reais em centavos
  NOW() - (RANDOM() * 7 || ' days')::interval
FROM customers 
WHERE status = 'active'
LIMIT 5;

INSERT INTO orders (customer_id, status, total_cents, created_at)
SELECT 
  id, 
  'shipped', 
  (RANDOM() * 40000 + 8000)::int,  -- 80 a 400 reais em centavos
  NOW() - (RANDOM() * 14 || ' days')::interval
FROM customers 
LIMIT 4;

INSERT INTO orders (customer_id, status, total_cents, created_at)
SELECT 
  id, 
  'cancelled', 
  (RANDOM() * 20000 + 2500)::int,  -- 25 a 200 reais em centavos
  NOW() - (RANDOM() * 60 || ' days')::interval
FROM customers 
WHERE status = 'inactive'
LIMIT 3;

-- =============================================
-- 3. ORDER_ITEMS (3-4 itens por pedido)
-- Colunas: id, order_id, product (text), quantity (int4), price_cents (int4), created_at
-- =============================================

INSERT INTO order_items (order_id, product, quantity, price_cents)
SELECT 
  o.id,
  (ARRAY['Notebook Dell', 'Mouse Logitech', 'Teclado Mecânico', 'Monitor 24"', 'Webcam HD', 'Headset Gamer', 'SSD 500GB', 'Memória RAM 16GB', 'Cadeira Ergonômica', 'Mesa Gamer'])[floor(random() * 10 + 1)],
  floor(random() * 3 + 1)::int,
  (RANDOM() * 30000 + 5000)::int  -- 50 a 300 reais em centavos
FROM orders o
CROSS JOIN generate_series(1, 3);

-- Adiciona mais alguns itens variados
INSERT INTO order_items (order_id, product, quantity, price_cents)
SELECT 
  o.id,
  (ARRAY['iPhone 15', 'Samsung Galaxy', 'AirPods Pro', 'Smartwatch', 'Tablet iPad', 'Echo Dot', 'Kindle', 'Carregador USB-C', 'Cabo HDMI', 'Mousepad'])[floor(random() * 10 + 1)],
  floor(random() * 2 + 1)::int,
  (RANDOM() * 50000 + 10000)::int  -- 100 a 500 reais em centavos
FROM orders o
WHERE random() > 0.5;

-- =============================================
-- VERIFICAÇÃO: Contagem dos dados
-- =============================================
-- Execute estas queries para verificar os dados:
-- SELECT COUNT(*) as total_customers FROM customers;
-- SELECT COUNT(*) as total_orders FROM orders;
-- SELECT COUNT(*) as total_order_items FROM order_items;
-- SELECT status, COUNT(*) FROM customers GROUP BY status;
-- SELECT status, COUNT(*) FROM orders GROUP BY status;
