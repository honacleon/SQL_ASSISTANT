# 📋 Fase 4: Inteligência e Economia - Prompts para Tempo

## 🎯 Contexto Geral

```
Continuando o SQL Assistant. Já implementado: visual premium (Fase 1), experiência conversacional (Fase 2), gráficos e exportação (Fase 3).

Esta fase foca em:
1. Otimizar custos de IA usando modelos mais baratos quando possível
2. Implementar Knowledge Base para descrições das tabelas/colunas

Arquivos importantes:
- backend/src/services/multiagent-improved.ts
- backend/src/services/ai.service.ts
- backend/src/config/env.config.ts
```

---

## 💰 PARTE 1: Otimização de Tokens (Modelo Econômico)

### Prompt 1.1 - Configurar modelo barato no backend

```
Atualize backend/src/config/env.config.ts para suportar dois modelos:

Adicione variáveis de ambiente:
- AI_MODEL_FAST: modelo rápido/barato (ex: claude-3-haiku-20240307 ou gpt-4o-mini)
- AI_MODEL_FULL: modelo completo (ex: claude-3-5-sonnet-20241022)

No objeto config exportado:
```typescript
ai: {
  provider: string,
  apiKey: string,
  modelFast: string,
  modelFull: string,
}
```

Valores default se não configurado:
- modelFast: 'claude-3-haiku-20240307'
- modelFull: 'claude-3-5-sonnet-20241022'

TESTE: Inicie o backend. Deve logar os dois modelos configurados no startup.
```

### Prompt 1.2 - Criar serviço de otimização de tokens

```
Crie backend/src/services/token-optimizer.ts:

```typescript
interface ModelSelection {
  model: 'fast' | 'full' | 'local';
  reason: string;
  estimatedTokens: number;
}

class TokenOptimizer {
  private queryPatterns: Map<string, { count: number; lastUsed: Date }>;
  
  selectModel(request: NLQueryRequest): ModelSelection
  isConversational(text: string): boolean
  isSimpleQuery(text: string): boolean
  requiresAnalysis(text: string): boolean
  getCachedClassification(query: string): ModelSelection | null
  cacheClassification(query: string, selection: ModelSelection): void
}
```

Regras de seleção:
1. Perguntas conversacionais (oi, ajuda, etc) → 'local' (sem IA)
2. Queries simples (contagem, listagem básica) → 'fast'
3. Análises complexas, comparações, insights → 'full'

Padrões simples (usar modelo rápido):
- "quantos", "qual o total", "listar", "mostrar"
- sem comparações temporais
- sem "analise", "explique", "compare"

TESTE: Chame selectModel() com diferentes perguntas. Classificação deve fazer sentido.
```

### Prompt 1.3 - Criar serviço de cache

```
Crie backend/src/services/cache.service.ts para cache de schema e queries:

```typescript
interface CacheEntry<T> {
  data: T;
  expiry: number;
  hits: number;
}

class CacheService {
  private schemaCache: Map<string, CacheEntry<any>>;
  private queryCache: Map<string, CacheEntry<any>>;
  
  // Schema cache (TTL longo - 1 hora)
  getSchema(tableNames: string[]): any | null
  setSchema(tableNames: string[], schema: any, ttlMs?: number): void
  
  // Query cache (TTL curto - 5 minutos)
  getQuery(hash: string): any | null
  setQuery(hash: string, result: any, ttlMs?: number): void
  
  // Limpar cache
  clearSchemaCache(): void
  clearQueryCache(): void
  clearAll(): void
  
  // Stats
  getStats(): { schemaHits: number; queryHits: number; size: number }
}

export const cacheService = new CacheService();
```

TESTE: Set e get do cache devem funcionar. Entry deve expirar após TTL.
```

### Prompt 1.4 - Integrar seleção de modelo no AI Service

```
Modifique backend/src/services/ai.service.ts para usar TokenOptimizer:

1. Importe TokenOptimizer e config
2. No método parseNaturalLanguage():
   - Chame tokenOptimizer.selectModel()
   - Use config.ai.modelFast ou config.ai.modelFull baseado na seleção
   - Logue qual modelo foi escolhido e porque

3. Adicione método para chamadas rápidas:
   - quickComplete(prompt: string): usa modelo fast
   - Para tarefas auxiliares como nomear sessões, sugerir descrições

TESTE: Faça perguntas simples ("quantos registros?") e complexas ("analise tendências"). Log deve mostrar modelos diferentes.
```

### Prompt 1.5 - Cachear schema das tabelas

```
Modifique backend/src/services/database.service.ts para cachear schema:

1. Importe cacheService
2. No método que busca schema (getTables, getColumns, etc):
   - Primeiro verificar cache
   - Se não encontrar, buscar do banco
   - Armazenar no cache antes de retornar

3. TTL do schema: 1 hora (schemas mudam raramente)

4. Adicione endpoint para invalidar cache manualmente:
   - POST /api/data/cache/invalidate
   - Útil se usuário alterar estrutura do banco

TESTE: Chame lista de tabelas 2x seguidas. Segunda chamada deve ser muito mais rápida (cache hit).
```

### Prompt 1.6 - Cachear queries frequentes

```
Modifique o fluxo de processamento de queries para cachear resultados:

No multiagent-improved.ts ou chat.routes.ts:
1. Gerar hash da query normalizada (lowercase, trim, remover espaços extras)
2. Verificar cache antes de processar
3. Se cache hit, retornar direto (muito rápido)
4. Se cache miss, processar normalmente e cachear resultado
5. Cache de query tem TTL curto: 5 minutos

Considere invalidar cache de query se:
- Usuário pede refresh explícito
- Dados envolvem data atual (hoje, agora)

TESTE: Faça mesma pergunta 2x em menos de 5 minutos. Segunda deve ser instantânea com nota "cached".
```

### Prompt 1.7 - Adicionar estatísticas de economia

```
Crie sistema para tracking de economia de tokens:

Crie backend/src/services/usage-stats.ts:
```typescript
interface UsageStats {
  queriesTotal: number;
  queriesFast: number;
  queriesFull: number;
  queriesLocal: number;
  tokensSaved: number;
  cacheHits: number;
  estimatedSavings: number; // em dólares
}

class UsageStatsService {
  recordQuery(model: 'fast' | 'full' | 'local', tokens: number): void
  recordCacheHit(): void
  getStats(): UsageStats
  resetStats(): void
}
```

Logue estatísticas periodicamente (a cada 100 queries ou 1 hora).

TESTE: Processe várias queries. Chame getStats(). Deve mostrar contagens e economia estimada.
```

### Prompt 1.8 - Exibir economia no frontend

```
Adicione widget de estatísticas no DashboardPage:

Crie src/components/common/UsageStats.tsx:
- Mostra queries hoje
- Mostra economia estimada
- Barra de progresso do uso

Posição: canto inferior direito, estilo discreto.
Pode ser colapsável (minimizar para apenas ícone).

Dados podem vir do backend via novo endpoint:
GET /api/stats/usage

Visual premium: números com estilo dourado, ícones de economia.

TESTE: Widget deve aparecer mostrando estatísticas em tempo real conforme você usa o chat.
```

---

## 📚 PARTE 2: Knowledge Base

### Prompt 2.1 - Criar schema para Knowledge Base

```
Crie backend/src/migrations/002_knowledge_base.sql:

```sql
CREATE TABLE table_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT UNIQUE NOT NULL,
  description TEXT,
  business_context TEXT,
  common_queries TEXT[], -- array de perguntas comuns
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE column_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  description TEXT,
  business_meaning TEXT,
  sample_values TEXT[],
  valid_values TEXT[], -- para enums
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name, column_name)
);

CREATE INDEX idx_column_metadata_table ON column_metadata(table_name);
```

Execute no Supabase SQL Editor.

TESTE: Insira um registro de teste em table_metadata. Deve funcionar sem erros.
```

### Prompt 2.2 - Criar serviço de Knowledge Base

```
Crie backend/src/services/knowledge.service.ts:

```typescript
interface TableMeta {
  tableName: string;
  description?: string;
  businessContext?: string;
  commonQueries?: string[];
  tags?: string[];
}

interface ColumnMeta {
  tableName: string;
  columnName: string;
  description?: string;
  businessMeaning?: string;
  sampleValues?: string[];
  validValues?: string[];
  isSensitive?: boolean;
}

class KnowledgeService {
  // Table metadata
  getTableMeta(tableName: string): Promise<TableMeta | null>
  setTableMeta(meta: TableMeta): Promise<void>
  
  // Column metadata
  getColumnMeta(tableName: string, columnName?: string): Promise<ColumnMeta[]>
  setColumnMeta(meta: ColumnMeta): Promise<void>
  
  // Bulk operations
  getFullTableContext(tableName: string): Promise<{ table: TableMeta; columns: ColumnMeta[] }>
  
  // Sugestões com IA
  suggestTableDescription(tableName: string, sampleData: any[]): Promise<string>
  suggestColumnDescriptions(tableName: string, columns: string[], sampleData: any[]): Promise<Record<string, string>>
}
```

TESTE: Chame setTableMeta e getTableMeta. Dados devem persistir e retornar corretamente.
```

### Prompt 2.3 - Adicionar rotas para Knowledge Base

```
Crie backend/src/routes/knowledge.routes.ts:

Rotas:
1. GET /api/knowledge/tables/:tableName - obter metadata da tabela
2. PUT /api/knowledge/tables/:tableName - atualizar metadata da tabela
3. GET /api/knowledge/tables/:tableName/columns - obter metadata das colunas
4. PUT /api/knowledge/tables/:tableName/columns/:columnName - atualizar coluna
5. POST /api/knowledge/tables/:tableName/suggest - gerar sugestões com IA

Registre as rotas em backend/src/index.ts:
app.use('/api/knowledge', authenticateApiKey, knowledgeRoutes);

TESTE: Chame PUT para salvar metadata. Chame GET para recuperar. Dados devem bater.
```

### Prompt 2.4 - Implementar sugestão com IA

```
Implemente os métodos de sugestão no KnowledgeService:

suggestTableDescription():
- Prompt: "Analise esta tabela com colunas [{colunas}] e dados de exemplo [{sample}]. Sugira uma descrição técnica curta (1-2 frases) do propósito desta tabela."
- Use modelo rápido (haiku)
- Limite sample a 5 linhas

suggestColumnDescriptions():
- Para cada coluna, sugira descrição baseada em:
  - Nome da coluna
  - Tipo de dado
  - Valores de exemplo
- Batch: processar até 10 colunas por chamada
- Prompt eficiente para economizar tokens

TESTE: Chame suggestTableDescription com tabela real. Deve retornar descrição sensata.
```

### Prompt 2.5 - Criar página de Knowledge Base no frontend

```
Crie src/pages/KnowledgeBasePage.tsx:

Layout:
- Lista de tabelas à esquerda
- Editor de metadata à direita
- Tabs: "Descrição Geral" | "Colunas"

Para cada tabela:
- Campo de descrição (textarea)
- Campo de contexto de negócio (textarea)
- Tags (chips editáveis)
- Perguntas comuns (lista editável)

Botões:
- "🤖 Sugerir com IA" - chama endpoint de sugestão
- "💾 Salvar" - persiste mudanças
- "↺ Resetar" - descarta mudanças

Visual: tema premium com cards elegantes.

TESTE: Navegue para /knowledge. Deve mostrar todas as tabelas. Editar e salvar deve persistir.
```

### Prompt 2.6 - Editor de colunas na Knowledge Base

```
Crie src/components/knowledge/ColumnsEditor.tsx:

Para cada coluna da tabela:
- Nome (readonly)
- Tipo (readonly)
- Descrição (input editável)
- Significado de negócio (input)
- Valores válidos (para enums - chips)
- Checkbox "Dados sensíveis"

Features:
- Expandir/recolher cada coluna
- "Sugerir todos" - sugere descrição para todas colunas de uma vez
- Highlight em colunas sem descrição
- Mostrar sample values automaticamente

TESTE: Abra tabela, vá para aba Colunas. Edite descrições. Salve. Recarregue - deve persistir.
```

### Prompt 2.7 - Integrar Knowledge Base no prompt da IA

```
Modifique multiagent-improved.ts para usar Knowledge Base:

No schemaAgent ou buildUserMessage:
1. Buscar metadata da tabela em contexto
2. Incluir descrições das colunas no prompt
3. Se tabela tem perguntas comuns, mencioná-las como exemplos

Formato no prompt:
```
Tabela: vendas
Descrição: Registra todas as vendas realizadas
Colunas:
- id: Identificador único da venda
- valor_total: Valor final com impostos incluídos
- status: Pode ser 'pendente', 'pago' ou 'cancelado'
```

Isso melhora significativamente as respostas da IA.

TESTE: Adicione descrição para uma tabela. Pergunte sobre ela. Resposta deve refletir o conhecimento configurado.
```

### Prompt 2.8 - Navegação para Knowledge Base

```
Adicione navegação para a página de Knowledge Base:

1. No sidebar do DashboardPage, adicione link para /knowledge
2. Ícone: 📚 ou Book
3. Ao clicar com botão direito em uma tabela, opção "Editar descrições"
4. Após selecionar tabela, mostrar badge se tem descrição configurada

Opcional: mini-preview da descrição ao hover sobre tabela.

TESTE: Clique no link Knowledge Base. Deve navegar corretamente. Botão direito em tabela deve ter opção.
```

### Prompt 2.9 - Importar/Exportar Knowledge Base

```
Adicione opção de importar/exportar configurações:

No KnowledgeBasePage:
- Botão "📥 Exportar" - baixa JSON com todas as descrições
- Botão "📤 Importar" - upload de JSON para restaurar/migrar

Formato JSON:
```json
{
  "version": "1.0",
  "tables": [
    {
      "name": "vendas",
      "description": "...",
      "columns": [...]
    }
  ]
}
```

Útil para:
- Backup das configurações
- Migrar entre ambientes
- Compartilhar com time

TESTE: Exporte. Modifique algo. Importe arquivo exportado. Configurações devem restaurar.
```

### Prompt 2.10 - Sugestão proativa ao conectar tabela

```
Melhore a experiência de primeira configuração:

Quando usuário seleciona uma tabela pela primeira vez:
1. Verificar se tem descrições no Knowledge Base
2. Se não tem, mostrar prompt sutil: "💡 Esta tabela ainda não tem descrições. Gostaria de configurar?"
3. Botão: "Configurar agora" → abre Knowledge Base nessa tabela
4. Botão: "Depois" → dismiss (não mostrar novamente nesta sessão)

Também ao receber resposta sobre tabela não configurada:
"📚 Dica: Configure descrições para esta tabela para respostas mais precisas."

TESTE: Selecione tabela não configurada. Sugestão deve aparecer de forma não intrusiva.
```

---

## ✅ Checklist de Verificação da Fase 4

Antes de passar para a Fase 5, verifique:

- [ ] Dois modelos de IA configurados (fast e full)
- [ ] TokenOptimizer classificando queries corretamente
- [ ] Cache de schema funcionando (verificar logs)
- [ ] Cache de queries funcionando (segunda chamada mais rápida)
- [ ] Estatísticas de uso sendo registradas
- [ ] Widget de economia aparecendo no frontend
- [ ] Tabelas de Knowledge Base criadas no Supabase
- [ ] CRUD de metadata funcionando
- [ ] Página de Knowledge Base navegável
- [ ] Editor de colunas funcionando
- [ ] Sugestões de IA gerando descrições
- [ ] Prompts da IA usando descrições configuradas
- [ ] Import/Export funcionando
- [ ] Nenhum erro no console
- [ ] Build de produção funciona
