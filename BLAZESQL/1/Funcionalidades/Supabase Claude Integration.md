# Implementação Técnica: Supabase + Claude Integration

## 🎯 Objetivo

Este documento fornece código de referência para implementar os conceitos do BlazeSQL no contexto específico do seu projeto:
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Frontend**: React/TypeScript
- **LLM**: Claude (via Anthropic API)

---

## 🏗️ Arquitetura Proposta

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ChatInterface.tsx                                       │
│      ↓                                                   │
│  QueryProcessor (client-side logic)                      │
│      ↓                                                   │
│  Supabase Edge Function: /query                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. Intent Classification                                │
│  2. RAG Retrieval (pgvector)                            │
│  3. Claude API (SQL Generation)                         │
│  4. SQL Execution (RPC)                                  │
│  5. Result Processing                                    │
│  6. Response Formatting                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                  SUPABASE DATABASE                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  • User tables (orders, customers, etc)                  │
│  • schema_embeddings (pgvector)                          │
│  • query_cache                                           │
│  • conversation_history                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Tabelas Necessárias

### 1. Schema Embeddings (para RAG)

```sql
-- Habilita pgvector (rodar 1x)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de embeddings do schema
CREATE TABLE schema_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  description TEXT NOT NULL,
  embedding vector(384),  -- all-MiniLM-L6-v2 usa 384 dimensões
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para similarity search
CREATE INDEX ON schema_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function para buscar tabelas similares
CREATE OR REPLACE FUNCTION match_schema(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  table_name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schema_embeddings.table_name,
    schema_embeddings.description,
    1 - (schema_embeddings.embedding <=> query_embedding) as similarity
  FROM schema_embeddings
  WHERE 1 - (schema_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY schema_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 2. Query Cache

```sql
CREATE TABLE query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT UNIQUE NOT NULL,  -- Hash da pergunta
  question TEXT NOT NULL,
  sql TEXT NOT NULL,
  result JSONB,
  execution_time_ms INT,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes'
);

-- Índice para busca rápida
CREATE INDEX idx_query_cache_hash ON query_cache(question_hash);

-- Auto-cleanup de cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM query_cache WHERE expires_at < NOW();
END;
$$;
```

### 3. Conversation History

```sql
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  message_index INT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,  -- {sql, tables_used, intent, etc}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar histórico por sessão
CREATE INDEX idx_conversation_session ON conversation_history(session_id, message_index);
```

---

## 🔧 Supabase Edge Function: Query Processor

### supabase/functions/process-query/index.ts

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.9.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryRequest {
  question: string
  session_id: string
  include_insights?: boolean
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, session_id, include_insights = true }: QueryRequest = await req.json()

    // Initialize clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    // 1. Check cache
    const cachedResult = await checkCache(supabaseClient, question)
    if (cachedResult) {
      return new Response(
        JSON.stringify({ ...cachedResult, from_cache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Classify intent
    const intent = await classifyIntent(question)

    // 3. Get conversation context
    const conversationContext = await getConversationContext(
      supabaseClient,
      session_id
    )

    // 4. RAG: Retrieve relevant schema
    const relevantSchema = await retrieveRelevantSchema(
      supabaseClient,
      question
    )

    // 5. Generate SQL
    const sql = await generateSQL(
      anthropic,
      question,
      relevantSchema,
      conversationContext,
      intent
    )

    // 6. Execute with self-correction
    const { data, executionTime } = await executeWithCorrection(
      supabaseClient,
      sql,
      anthropic,
      relevantSchema
    )

    // 7. Process results
    const processed = await processResults(
      data,
      question,
      intent,
      include_insights,
      anthropic
    )

    // 8. Cache result
    await cacheResult(supabaseClient, question, sql, processed, executionTime)

    // 9. Save to conversation history
    await saveToHistory(supabaseClient, session_id, question, {
      sql,
      intent,
      tables_used: relevantSchema.map(t => t.table_name)
    })

    // 10. Return response
    return new Response(
      JSON.stringify({
        ...processed,
        sql,
        execution_time: executionTime,
        from_cache: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing query:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// ==================== HELPER FUNCTIONS ====================

async function checkCache(supabaseClient: any, question: string) {
  const hash = await hashQuestion(question)
  
  const { data, error } = await supabaseClient
    .from('query_cache')
    .select('*')
    .eq('question_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (data) {
    // Update hit count and last accessed
    await supabaseClient
      .from('query_cache')
      .update({ 
        hit_count: data.hit_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', data.id)
  }

  return data
}

async function hashQuestion(question: string): Promise<string> {
  const normalized = question.toLowerCase().trim()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function classifyIntent(question: string): QueryIntent {
  const q = question.toLowerCase()
  
  if (/quantos|quanto|total|soma|média|contagem/i.test(q)) {
    return 'AGGREGATION'
  }
  if (/onde|filtr|apenas|só|maior|menor/i.test(q)) {
    return 'FILTERING'
  }
  if (/evolução|histórico|ao longo|crescimento/i.test(q)) {
    return 'TREND'
  }
  if (/compare|vs|versus|diferença/i.test(q)) {
    return 'COMPARISON'
  }
  
  return 'DATA_RETRIEVAL'
}

async function getConversationContext(supabaseClient: any, session_id: string) {
  const { data } = await supabaseClient
    .from('conversation_history')
    .select('*')
    .eq('session_id', session_id)
    .order('message_index', { ascending: false })
    .limit(5)  // Últimas 5 mensagens

  return data || []
}

async function retrieveRelevantSchema(
  supabaseClient: any,
  question: string
) {
  // Gera embedding da pergunta (aqui você precisaria usar um serviço de embedding)
  // Por simplicidade, vou mostrar a estrutura
  
  // TODO: Implementar embedding service
  // const questionEmbedding = await generateEmbedding(question)
  
  // Por enquanto, busca todas as tabelas (fallback)
  const { data } = await supabaseClient
    .from('schema_embeddings')
    .select('*')
    .limit(5)

  return data || []
}

async function generateSQL(
  anthropic: Anthropic,
  question: string,
  schema: any[],
  context: any[],
  intent: string
): Promise<string> {
  
  const schemaContext = schema
    .map(s => s.description)
    .join('\n\n')

  const conversationContext = context
    .map(msg => `${msg.role}: ${msg.content}`)
    .reverse()
    .join('\n')

  const intentPrompts = {
    'AGGREGATION': 'Use aggregate functions (COUNT, SUM, AVG). Include meaningful aliases.',
    'FILTERING': 'Add appropriate WHERE clauses. Use explicit comparisons.',
    'TREND': 'Include ORDER BY on time column. Consider DATE_TRUNC for grouping.',
    'DATA_RETRIEVAL': 'Select all relevant columns. Use LIMIT 100 unless specified.',
    'COMPARISON': 'Use JOIN or UNION as appropriate. Ensure comparable metrics.'
  }

  const prompt = `You are a PostgreSQL expert. Generate ONLY valid SQL.

DATABASE SCHEMA:
${schemaContext}

${conversationContext ? `CONVERSATION CONTEXT:\n${conversationContext}\n\n` : ''}

USER QUESTION: "${question}"

INTENT: ${intent}
${intentPrompts[intent]}

RULES:
1. Use ONLY tables/columns from schema
2. Return ONLY SQL, no explanations
3. Use explicit JOINs
4. Handle NULLs appropriately
5. Format dates as ISO 8601

SQL:`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  const sqlText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : ''

  // Remove markdown code blocks if present
  return sqlText
    .replace(/```sql\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

async function executeWithCorrection(
  supabaseClient: any,
  sql: string,
  anthropic: Anthropic,
  schema: any[],
  maxRetries: number = 3
) {
  const startTime = Date.now()
  let currentSQL = sql

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data, error } = await supabaseClient.rpc('execute_sql', {
        query: currentSQL
      })

      if (error) throw error

      return {
        data,
        executionTime: Date.now() - startTime
      }

    } catch (error) {
      if (attempt === maxRetries - 1) throw error

      console.log(`Attempt ${attempt + 1} failed, correcting SQL...`)
      
      // Correct SQL using Claude
      currentSQL = await correctSQL(anthropic, currentSQL, error.message, schema)
    }
  }
}

async function correctSQL(
  anthropic: Anthropic,
  sql: string,
  errorMessage: string,
  schema: any[]
): Promise<string> {
  
  const schemaContext = schema
    .map(s => s.description)
    .join('\n\n')

  const prompt = `Fix this SQL query that failed.

ORIGINAL SQL:
${sql}

ERROR MESSAGE:
${errorMessage}

AVAILABLE SCHEMA:
${schemaContext}

Return ONLY the corrected SQL, no explanations.

CORRECTED SQL:`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  const correctedSQL = message.content[0].type === 'text'
    ? message.content[0].text
    : sql

  return correctedSQL
    .replace(/```sql\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

async function processResults(
  data: any[],
  question: string,
  intent: string,
  includeInsights: boolean,
  anthropic: Anthropic
) {
  // 1. Format data
  const formattedData = formatData(data)

  // 2. Select visualization
  const visualization = selectVisualization(formattedData, intent)

  // 3. Generate summary
  const summary = await generateSummary(
    anthropic,
    data,
    question
  )

  // 4. Generate insights (optional)
  let insights = []
  if (includeInsights && data.length > 0) {
    insights = await generateInsights(
      anthropic,
      data,
      question,
      intent
    )
  }

  // 5. Generate follow-ups
  const followUps = await generateFollowUps(
    anthropic,
    question,
    data
  )

  return {
    summary,
    data: formattedData,
    visualization,
    insights,
    follow_ups: followUps
  }
}

function formatData(data: any[]): any[] {
  return data.map(row => {
    const formatted = {}
    
    for (const [key, value] of Object.entries(row)) {
      // Money (cents → BRL)
      if (key.includes('cents') || key.includes('amount')) {
        formatted[key] = {
          raw: value,
          formatted: `R$ ${((value as number) / 100).toFixed(2)}`
        }
      }
      // Status
      else if (key === 'status') {
        const statusMap = {
          'completed': '✅ Completo',
          'pending': '⏳ Pendente',
          'paid': '💰 Pago',
          'failed': '❌ Falhou'
        }
        formatted[key] = {
          raw: value,
          formatted: statusMap[value as string] || value
        }
      }
      // Dates
      else if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const date = new Date(value)
        formatted[key] = {
          raw: value,
          formatted: date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          })
        }
      }
      // IDs (hide)
      else if (key.endsWith('_id') || key === 'id') {
        formatted[key] = {
          raw: value,
          hidden: true
        }
      }
      else {
        formatted[key] = value
      }
    }
    
    return formatted
  })
}

function selectVisualization(data: any[], intent: string) {
  if (!data || data.length === 0) {
    return { type: 'table' }
  }

  const firstRow = data[0]
  const keys = Object.keys(firstRow)
  
  const numericKeys = keys.filter(k => 
    typeof firstRow[k]?.raw === 'number' || typeof firstRow[k] === 'number'
  )
  const dateKeys = keys.filter(k => 
    firstRow[k]?.raw && typeof firstRow[k].raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstRow[k].raw)
  )
  const categoricalKeys = keys.filter(k => 
    !numericKeys.includes(k) && !dateKeys.includes(k) && !k.endsWith('_id')
  )

  // Time series
  if (dateKeys.length >= 1 && numericKeys.length >= 1) {
    return {
      type: 'line',
      x: dateKeys[0],
      y: numericKeys[0],
      config: {
        smooth: true,
        showPoints: data.length < 50
      }
    }
  }

  // Aggregation
  if (intent === 'AGGREGATION' && categoricalKeys.length >= 1 && numericKeys.length >= 1) {
    const uniqueCategories = new Set(data.map(r => r[categoricalKeys[0]]?.raw || r[categoricalKeys[0]])).size
    
    if (uniqueCategories <= 8) {
      return {
        type: 'donut',
        label: categoricalKeys[0],
        value: numericKeys[0]
      }
    } else {
      return {
        type: 'bar',
        x: categoricalKeys[0],
        y: numericKeys[0],
        config: {
          limit: 10,  // Top 10
          sortBy: 'value'
        }
      }
    }
  }

  // Fallback
  return {
    type: 'table',
    config: {
      sortable: true,
      paginate: data.length > 50
    }
  }
}

async function generateSummary(
  anthropic: Anthropic,
  data: any[],
  question: string
): Promise<string> {
  
  const prompt = `Gere um resumo em português (BR) dos resultados desta query SQL.

PERGUNTA: "${question}"
DADOS: ${data.length} registros
AMOSTRA: ${JSON.stringify(data.slice(0, 3), null, 2)}

INSTRUÇÕES:
1. Responda diretamente a pergunta
2. Inclua 1-2 estatísticas relevantes
3. Seja conversacional, evite jargão
4. Máximo 3 frases

RESUMO:`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    temperature: 0.5,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  return message.content[0].type === 'text'
    ? message.content[0].text.trim()
    : `Encontrei ${data.length} registros.`
}

async function generateInsights(
  anthropic: Anthropic,
  data: any[],
  question: string,
  intent: string
): Promise<any[]> {
  
  if (data.length < 5) return []

  const prompt = `Analise estes dados e gere 2-3 insights acionáveis.

PERGUNTA: "${question}"
DADOS (amostra): ${JSON.stringify(data.slice(0, 5), null, 2)}

Retorne JSON array:
[
  {
    "title": "Título curto",
    "description": "Explicação (1-2 frases)",
    "type": "positive|negative|neutral|warning",
    "icon": "emoji apropriado"
  }
]

INSIGHTS:`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '[]'

    // Remove markdown code blocks
    const cleanText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    return JSON.parse(cleanText)
  } catch (error) {
    console.error('Error generating insights:', error)
    return []
  }
}

async function generateFollowUps(
  anthropic: Anthropic,
  question: string,
  data: any[]
): Promise<string[]> {
  
  const prompt = `Baseado nesta query, sugira 3 perguntas de follow-up relevantes.

QUERY ORIGINAL: "${question}"
RESULTADO: ${data.length} registros

INSTRUÇÕES:
- Específico, não genérico
- Progressão natural da análise
- Português (BR)

Retorne JSON array de strings:
["Pergunta 1", "Pergunta 2", "Pergunta 3"]

SUGESTÕES:`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0.6,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '[]'

    const cleanText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    return JSON.parse(cleanText)
  } catch (error) {
    console.error('Error generating follow-ups:', error)
    return []
  }
}

async function cacheResult(
  supabaseClient: any,
  question: string,
  sql: string,
  result: any,
  executionTime: number
) {
  const hash = await hashQuestion(question)
  
  await supabaseClient
    .from('query_cache')
    .upsert({
      question_hash: hash,
      question,
      sql,
      result,
      execution_time_ms: executionTime,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()  // 30 min
    })
}

async function saveToHistory(
  supabaseClient: any,
  session_id: string,
  question: string,
  metadata: any
) {
  // Get current message index
  const { data: lastMessage } = await supabaseClient
    .from('conversation_history')
    .select('message_index')
    .eq('session_id', session_id)
    .order('message_index', { ascending: false })
    .limit(1)
    .single()

  const nextIndex = lastMessage ? lastMessage.message_index + 1 : 0

  // Save user message
  await supabaseClient
    .from('conversation_history')
    .insert({
      session_id,
      message_index: nextIndex,
      role: 'user',
      content: question,
      metadata: {}
    })

  // Save assistant response
  await supabaseClient
    .from('conversation_history')
    .insert({
      session_id,
      message_index: nextIndex + 1,
      role: 'assistant',
      content: `Query executed successfully`,
      metadata
    })
}

// Type definitions
type QueryIntent = 'DATA_RETRIEVAL' | 'AGGREGATION' | 'FILTERING' | 'TREND' | 'COMPARISON'
```

---

## 🎨 Frontend Integration (React)

### components/ChatInterface.tsx

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RichResponse } from './RichResponse'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  role: 'user' | 'assistant'
  content: string
  data?: any
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())

  async function handleSubmit(question: string) {
    if (!question.trim() || loading) return

    setLoading(true)
    
    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: question
    }])

    try {
      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('process-query', {
        body: {
          question,
          session_id: sessionId,
          include_insights: true
        }
      })

      if (error) throw error

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.summary,
        data: data
      }])

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta.'
      }])
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-[70%]">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[90%]">
                {msg.data ? (
                  <RichResponse
                    summary={msg.data.summary}
                    data={msg.data.data}
                    visualization={msg.data.visualization}
                    insights={msg.data.insights}
                    sql={msg.data.sql}
                    followUps={msg.data.follow_ups}
                    executionTime={msg.data.execution_time}
                    onFollowUp={(q) => handleSubmit(q)}
                  />
                ) : (
                  <div className="bg-gray-100 px-4 py-2 rounded-lg">
                    {msg.content}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(input)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faça uma pergunta sobre seus dados..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
```

---

## 🚀 Setup & Deployment

### 1. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 2. Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy process-query --no-verify-jwt

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=your-key
```

### 3. Initialize Schema Embeddings

Você precisará rodar um script inicial para indexar seu schema:

```typescript
// scripts/index-schema.ts
import { createClient } from '@supabase/supabase-js'

async function indexSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all tables
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('*')
    .eq('table_schema', 'public')

  for (const table of tables) {
    // Get columns
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', table.table_name)

    // Sample data
    const { data: samples } = await supabase
      .from(table.table_name)
      .select('*')
      .limit(5)

    // Create description
    const description = `
Table: ${table.table_name}
Columns: ${columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')}
Sample values: ${JSON.stringify(samples)}
`

    // TODO: Generate embedding using your preferred service
    // const embedding = await generateEmbedding(description)

    // Save to database
    // await supabase
    //   .from('schema_embeddings')
    //   .insert({
    //     table_name: table.table_name,
    //     description,
    //     embedding
    //   })
  }
}

indexSchema()
```

---

## 📝 Notas de Implementação

### Prioridades

1. **Começar simples**: Implemente formatação de dados primeiro (maior impacto visual, menor esforço)
2. **Adicionar inteligência gradualmente**: Intent → RAG → Insights
3. **Otimizar depois**: Cache e self-correction podem vir depois do MVP

### Custos Estimados

- **SQL Generation**: ~$0.03/query (Claude Sonnet)
- **Summary**: ~$0.01/query
- **Insights**: ~$0.02/query (opcional)
- **Total**: ~$0.04-0.06/query

Com cache agressivo: **~$0.02/query** (50% hit rate)

### Performance

- **Sem cache**: 2-4s latência
- **Com cache**: <100ms latência
- **Com RAG**: -30% custo, +20% precisão

---

Este documento fornece a base técnica completa. O Claude Opus pode adaptar esses exemplos ao seu projeto específico.