# AI Data Assistant Database Setup

This directory contains the database schema and sample data for the AI Data Assistant application.

## Database Structure

The database includes the following tables:

### Core Tables
- **categories** - Product categories (Electronics, Clothing, Books, etc.)
- **products** - Product catalog with pricing and inventory
- **customers** - Customer information and registration data
- **orders** - Customer orders with status tracking
- **order_items** - Individual items within each order

### Key Features
- ✅ **UUID Primary Keys** - For better scalability and security
- ✅ **Automatic Timestamps** - Created/updated timestamps with triggers
- ✅ **Data Integrity** - Foreign key constraints and check constraints
- ✅ **Performance Indexes** - Optimized for common query patterns
- ✅ **Customer Statistics** - Automatically maintained totals via triggers

## Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project at https://supabase.com
2. Copy your project URL and service role key
3. Update your `.env` file with the credentials:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```

### 2. Schema Installation
Execute the following SQL files in your Supabase SQL editor in order:

1. **schema.sql** - Creates all tables, indexes, and functions
2. **sample_data.sql** - Inserts realistic sample data for testing

### 3. Verification
After running the scripts, you should have:
- 5 categories with 18 products
- 10 customers with complete profiles
- 10 orders with various statuses (pending, confirmed, shipped, delivered)
- 20+ order items showing purchase history

## Sample Queries for Testing

Here are some example queries you can try with the AI assistant:

### Basic Queries
- "Show me all customers"
- "How many products do we have?"
- "List all electronics products"
- "What are our top selling categories?"

### Analytics Queries
- "Show me total sales by month"
- "Which customers have spent the most money?"
- "What's the average order value?"
- "How many orders are pending?"

### Complex Queries
- "Show me customers who have ordered electronics in the last 3 months"
- "What's the total inventory value by category?"
- "Find customers with more than 2 orders"
- "Show me the most popular products"

## Data Relationships

```
categories
    ↓ (one-to-many)
products
    ↓ (many-to-many via order_items)
orders
    ↑ (many-to-one)
customers
```

## Performance Considerations

The schema includes several performance optimizations:

1. **Strategic Indexes**
   - Text search indexes for product names
   - Date indexes for time-based queries
   - Foreign key indexes for joins

2. **Materialized Statistics**
   - Customer totals (orders count, total spent)
   - Automatically updated via triggers

3. **Data Types**
   - UUID for primary keys (better distribution)
   - DECIMAL for monetary values (precise arithmetic)
   - Timestamp with time zone for global compatibility

## Security Notes

- All tables use Row Level Security (RLS) policies
- Service role key required for administrative operations
- Consider creating additional policies for different user roles

## Maintenance

The database includes automatic maintenance features:
- Updated timestamps via triggers
- Customer statistics automatically recalculated
- Constraint validation ensures data integrity

## Troubleshooting

**Common Issues:**

1. **Connection Errors**
   - Verify your SUPABASE_URL and SUPABASE_SERVICE_KEY
   - Check that your Supabase project is active

2. **Permission Errors**
   - Ensure you're using the service role key (not anon key)
   - Check RLS policies if using different credentials

3. **Query Performance**
   - All common query patterns have appropriate indexes
   - Consider EXPLAIN ANALYZE for complex queries

## Development Tips

- Use the sample data for initial testing
- Test AI queries with various complexity levels
- Monitor query performance in the Supabase dashboard
- Consider adding more sample data for stress testing