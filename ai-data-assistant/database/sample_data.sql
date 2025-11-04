-- AI Data Assistant Sample Data
-- This file provides realistic sample data for testing and demonstration

-- Insert Categories
INSERT INTO categories (id, name, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'Electronic devices and gadgets'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Clothing', 'Apparel and fashion items'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Books', 'Physical and digital books'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Home & Garden', 'Home improvement and garden supplies'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Sports', 'Sports equipment and accessories');

-- Insert Products
INSERT INTO products (id, name, description, price, category_id, stock_quantity, is_active) VALUES
    -- Electronics
    ('650e8400-e29b-41d4-a716-446655440001', 'Laptop Pro 15"', 'High-performance laptop with 16GB RAM', 1299.99, '550e8400-e29b-41d4-a716-446655440001', 25, true),
    ('650e8400-e29b-41d4-a716-446655440002', 'Wireless Headphones', 'Noise-cancelling Bluetooth headphones', 199.99, '550e8400-e29b-41d4-a716-446655440001', 50, true),
    ('650e8400-e29b-41d4-a716-446655440003', 'Smartphone X', 'Latest smartphone with advanced camera', 899.99, '550e8400-e29b-41d4-a716-446655440001', 30, true),
    ('650e8400-e29b-41d4-a716-446655440004', 'Tablet 10"', 'Lightweight tablet for productivity', 349.99, '550e8400-e29b-41d4-a716-446655440001', 40, true),
    ('650e8400-e29b-41d4-a716-446655440005', 'Smart Watch', 'Fitness tracking smartwatch', 299.99, '550e8400-e29b-41d4-a716-446655440001', 35, true),

    -- Clothing
    ('650e8400-e29b-41d4-a716-446655440006', 'Premium T-Shirt', '100% cotton premium t-shirt', 29.99, '550e8400-e29b-41d4-a716-446655440002', 100, true),
    ('650e8400-e29b-41d4-a716-446655440007', 'Denim Jeans', 'Classic blue denim jeans', 79.99, '550e8400-e29b-41d4-a716-446655440002', 75, true),
    ('650e8400-e29b-41d4-a716-446655440008', 'Winter Jacket', 'Warm winter jacket with hood', 149.99, '550e8400-e29b-41d4-a716-446655440002', 45, true),
    ('650e8400-e29b-41d4-a716-446655440009', 'Sneakers', 'Comfortable running sneakers', 119.99, '550e8400-e29b-41d4-a716-446655440002', 60, true),

    -- Books
    ('650e8400-e29b-41d4-a716-446655440010', 'The Art of Programming', 'Comprehensive programming guide', 49.99, '550e8400-e29b-41d4-a716-446655440003', 200, true),
    ('650e8400-e29b-41d4-a716-446655440011', 'Data Science Handbook', 'Complete guide to data science', 59.99, '550e8400-e29b-41d4-a716-446655440003', 150, true),
    ('650e8400-e29b-41d4-a716-446655440012', 'Fiction Novel: The Journey', 'Bestselling adventure novel', 24.99, '550e8400-e29b-41d4-a716-446655440003', 300, true),

    -- Home & Garden
    ('650e8400-e29b-41d4-a716-446655440013', 'Coffee Maker', 'Automatic drip coffee maker', 89.99, '550e8400-e29b-41d4-a716-446655440004', 25, true),
    ('650e8400-e29b-41d4-a716-446655440014', 'Garden Tool Set', 'Complete gardening tool kit', 129.99, '550e8400-e29b-41d4-a716-446655440004', 30, true),
    ('650e8400-e29b-41d4-a716-446655440015', 'LED Lamp', 'Modern adjustable LED desk lamp', 69.99, '550e8400-e29b-41d4-a716-446655440004', 80, true),

    -- Sports
    ('650e8400-e29b-41d4-a716-446655440016', 'Yoga Mat', 'Non-slip premium yoga mat', 39.99, '550e8400-e29b-41d4-a716-446655440005', 120, true),
    ('650e8400-e29b-41d4-a716-446655440017', 'Tennis Racket', 'Professional tennis racket', 159.99, '550e8400-e29b-41d4-a716-446655440005', 20, true),
    ('650e8400-e29b-41d4-a716-446655440018', 'Basketball', 'Official size basketball', 29.99, '550e8400-e29b-41d4-a716-446655440005', 50, true);

-- Insert Customers
INSERT INTO customers (id, first_name, last_name, email, phone, address, city, country, date_of_birth, registration_date) VALUES
    ('750e8400-e29b-41d4-a716-446655440001', 'John', 'Smith', 'john.smith@email.com', '+1-555-0101', '123 Main St', 'New York', 'USA', '1985-03-15', '2023-01-15 10:30:00+00'),
    ('750e8400-e29b-41d4-a716-446655440002', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '+1-555-0102', '456 Oak Ave', 'Los Angeles', 'USA', '1990-07-22', '2023-02-20 14:45:00+00'),
    ('750e8400-e29b-41d4-a716-446655440003', 'Michael', 'Brown', 'michael.brown@email.com', '+1-555-0103', '789 Pine St', 'Chicago', 'USA', '1988-11-30', '2023-03-10 09:15:00+00'),
    ('750e8400-e29b-41d4-a716-446655440004', 'Emily', 'Davis', 'emily.davis@email.com', '+1-555-0104', '321 Elm St', 'Houston', 'USA', '1992-05-08', '2023-04-05 16:20:00+00'),
    ('750e8400-e29b-41d4-a716-446655440005', 'David', 'Wilson', 'david.wilson@email.com', '+1-555-0105', '654 Maple Dr', 'Phoenix', 'USA', '1987-09-12', '2023-05-12 11:10:00+00'),
    ('750e8400-e29b-41d4-a716-446655440006', 'Lisa', 'Anderson', 'lisa.anderson@email.com', '+1-555-0106', '987 Cedar Ln', 'Philadelphia', 'USA', '1991-01-28', '2023-06-18 13:30:00+00'),
    ('750e8400-e29b-41d4-a716-446655440007', 'Robert', 'Taylor', 'robert.taylor@email.com', '+1-555-0107', '147 Birch Ave', 'San Antonio', 'USA', '1986-12-03', '2023-07-25 08:45:00+00'),
    ('750e8400-e29b-41d4-a716-446655440008', 'Jennifer', 'Martinez', 'jennifer.martinez@email.com', '+1-555-0108', '258 Spruce St', 'San Diego', 'USA', '1994-04-17', '2023-08-30 15:55:00+00'),
    ('750e8400-e29b-41d4-a716-446655440009', 'William', 'Garcia', 'william.garcia@email.com', '+1-555-0109', '369 Willow Rd', 'Dallas', 'USA', '1989-08-25', '2023-09-14 12:25:00+00'),
    ('750e8400-e29b-41d4-a716-446655440010', 'Amanda', 'Rodriguez', 'amanda.rodriguez@email.com', '+1-555-0110', '741 Poplar St', 'San Jose', 'USA', '1993-06-11', '2023-10-08 10:15:00+00');

-- Insert Orders with realistic order numbers
INSERT INTO orders (id, customer_id, order_number, order_date, status, total_amount, shipping_address, notes) VALUES
    ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'ORD-2024-001', '2024-01-15 10:30:00+00', 'delivered', 1329.98, '123 Main St, New York, USA', 'Leave at front door'),
    ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'ORD-2024-002', '2024-01-20 14:45:00+00', 'delivered', 199.99, '456 Oak Ave, Los Angeles, USA', 'Ring doorbell'),
    ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 'ORD-2024-003', '2024-02-05 09:15:00+00', 'delivered', 949.98, '789 Pine St, Chicago, USA', 'Call upon arrival'),
    ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440004', 'ORD-2024-004', '2024-02-18 16:20:00+00', 'delivered', 179.98, '321 Elm St, Houston, USA', NULL),
    ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440005', 'ORD-2024-005', '2024-03-01 11:10:00+00', 'shipped', 299.99, '654 Maple Dr, Phoenix, USA', 'Handle with care'),
    ('850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440006', 'ORD-2024-006', '2024-03-12 13:30:00+00', 'confirmed', 149.99, '987 Cedar Ln, Philadelphia, USA', NULL),
    ('850e8400-e29b-41d4-a716-446655440007', '750e8400-e29b-41d4-a716-446655440007', 'ORD-2024-007', '2024-03-25 08:45:00+00', 'shipped', 109.98, '147 Birch Ave, San Antonio, USA', 'Gift wrap requested'),
    ('850e8400-e29b-41d4-a716-446655440008', '750e8400-e29b-41d4-a716-446655440008', 'ORD-2024-008', '2024-04-05 15:55:00+00', 'delivered', 349.99, '258 Spruce St, San Diego, USA', NULL),
    ('850e8400-e29b-41d4-a716-446655440009', '750e8400-e29b-41d4-a716-446655440009', 'ORD-2024-009', '2024-04-18 12:25:00+00', 'pending', 79.99, '369 Willow Rd, Dallas, USA', 'Express delivery'),
    ('850e8400-e29b-41d4-a716-446655440010', '750e8400-e29b-41d4-a716-446655440010', 'ORD-2024-010', '2024-05-02 10:15:00+00', 'confirmed', 289.97, '741 Poplar St, San Jose, USA', NULL);

-- Insert Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
    -- Order 1: John Smith - Laptop + T-Shirt
    ('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 1, 1299.99, 1299.99),
    ('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440006', 1, 29.99, 29.99),

    -- Order 2: Sarah Johnson - Headphones
    ('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 1, 199.99, 199.99),

    -- Order 3: Michael Brown - Smartphone + Sneakers
    ('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 1, 899.99, 899.99),
    ('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440009', 1, 119.99, 119.99),
    ('850e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440006', 1, 29.99, 29.99),

    -- Order 4: Emily Davis - Winter Jacket + Premium T-Shirt
    ('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440008', 1, 149.99, 149.99),
    ('850e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440006', 1, 29.99, 29.99),

    -- Order 5: David Wilson - Smart Watch
    ('850e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440005', 1, 299.99, 299.99),

    -- Order 6: Lisa Anderson - Winter Jacket
    ('850e8400-e29b-41d4-a716-446655440006', '650e8400-e29b-41d4-a716-446655440008', 1, 149.99, 149.99),

    -- Order 7: Robert Taylor - Books (Programming + Fiction)
    ('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440010', 1, 49.99, 49.99),
    ('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440012', 2, 24.99, 49.98),
    ('850e8400-e29b-41d4-a716-446655440007', '650e8400-e29b-41d4-a716-446655440006', 1, 29.99, 29.99),

    -- Order 8: Jennifer Martinez - Tablet
    ('850e8400-e29b-41d4-a716-446655440008', '650e8400-e29b-41d4-a716-446655440004', 1, 349.99, 349.99),

    -- Order 9: William Garcia - Jeans
    ('850e8400-e29b-41d4-a716-446655440009', '650e8400-e29b-41d4-a716-446655440007', 1, 79.99, 79.99),

    -- Order 10: Amanda Rodriguez - Coffee Maker + Yoga Mat + Books
    ('850e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440013', 1, 89.99, 89.99),
    ('850e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440016', 1, 39.99, 39.99),
    ('850e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440011', 1, 59.99, 59.99),
    ('850e8400-e29b-41d4-a716-446655440010', '650e8400-e29b-41d4-a716-446655440012', 4, 24.99, 99.96);

-- Final statistics will be automatically updated by triggers