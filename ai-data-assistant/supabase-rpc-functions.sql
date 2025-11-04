-- ============================================
-- SUPABASE RPC FUNCTIONS PARA PERFORMANCE
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. FUNCTION GENÉRICA: Executar qualquer SQL
-- ⏱️ Performance: ~200-500ms
-- 📊 Uso: Queries complexas com GROUP BY, CASE, etc
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Executa a query e retorna como JSON array
  EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
  RETURN COALESCE(result, '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao executar SQL: %', SQLERRM;
    RETURN '[]'::json;
END;
$$;

-- Teste:
-- SELECT execute_sql('SELECT COUNT(*) as total FROM anonymous_enrollment_clicks');


-- 2. FUNCTION ESPECÍFICA: Categorizar User Agents
-- ⏱️ Performance: ~100-300ms (otimizada)
-- 📊 Uso: Análise de dispositivos (mobile/desktop/bots)
CREATE OR REPLACE FUNCTION categorize_user_agents(table_name text)
RETURNS TABLE(device_type text, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      CASE 
        WHEN user_agent ILIKE ''%%mobile%%'' OR 
             user_agent ILIKE ''%%android%%'' OR 
             user_agent ILIKE ''%%iphone%%'' OR 
             user_agent ILIKE ''%%ipad%%'' OR 
             user_agent ILIKE ''%%ipod%%'' THEN ''mobile''
        WHEN user_agent ILIKE ''%%bot%%'' OR 
             user_agent ILIKE ''%%crawler%%'' OR 
             user_agent ILIKE ''%%spider%%'' OR 
             user_agent ILIKE ''%%scraper%%'' THEN ''bots''
        ELSE ''desktop''
      END AS device_type,
      COUNT(*) as total
    FROM %I
    WHERE user_agent IS NOT NULL
    GROUP BY device_type
    ORDER BY total DESC
  ', table_name);
END;
$$;

-- Teste:
-- SELECT * FROM categorize_user_agents('anonymous_enrollment_clicks');


-- 3. FUNCTION: Agrupar por mês (para análises temporais)
-- ⏱️ Performance: ~200-400ms
-- 📊 Uso: Distribuição mensal de leads
CREATE OR REPLACE FUNCTION group_by_month(
  table_name text,
  date_column text DEFAULT 'created_at',
  count_column text DEFAULT '*'
)
RETURNS TABLE(mes timestamptz, total bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      DATE_TRUNC(''month'', %I) AS mes,
      COUNT(%s) as total
    FROM %I
    WHERE %I IS NOT NULL
    GROUP BY DATE_TRUNC(''month'', %I)
    ORDER BY mes DESC
  ', date_column, count_column, table_name, date_column, date_column);
END;
$$;

-- Teste:
-- SELECT * FROM group_by_month('qualified_leads_aug25', 'updated_at', 'DISTINCT email');


-- 4. FUNCTION: Top N registros
-- ⏱️ Performance: ~50-200ms
-- 📊 Uso: Últimos registros, top leads, etc
CREATE OR REPLACE FUNCTION get_top_records(
  table_name text,
  order_column text DEFAULT 'created_at',
  limit_count int DEFAULT 10,
  order_direction text DEFAULT 'DESC'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE format('
    SELECT json_agg(t) 
    FROM (
      SELECT * 
      FROM %I 
      ORDER BY %I %s 
      LIMIT %s
    ) t
  ', table_name, order_column, order_direction, limit_count) INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Teste:
-- SELECT get_top_records('qualified_leads_aug25', 'updated_at', 5, 'DESC');


-- ============================================
-- PERMISSÕES (importante!)
-- ============================================

-- Concede acesso às functions para usuários autenticados
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION categorize_user_agents(text) TO authenticated;
GRANT EXECUTE ON FUNCTION group_by_month(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_records(text, text, int, text) TO authenticated;

-- Para service_role (backend)
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION categorize_user_agents(text) TO service_role;
GRANT EXECUTE ON FUNCTION group_by_month(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_records(text, text, int, text) TO service_role;


-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Lista todas as functions criadas
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'execute_sql',
    'categorize_user_agents', 
    'group_by_month',
    'get_top_records'
  );
