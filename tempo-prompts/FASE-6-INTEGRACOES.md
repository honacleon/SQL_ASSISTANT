# 📋 Fase 6: Integrações - Prompts para Tempo

## 🎯 Contexto Geral

```
Continuando o SQL Assistant. Já implementado: visual premium, experiência conversacional, gráficos, otimização de tokens, Knowledge Base, e dashboards.

Esta fase foca em:
1. Upload de arquivos CSV para criar tabelas temporárias
2. Preparação para conectores de banco de dados (PostgreSQL, MySQL, etc)
```

---

## 📤 PARTE 1: Upload de CSV

### Prompt 1.1 - Criar componente de upload

```
Crie src/components/data/CsvUploader.tsx:

UI:
- Área de drag & drop central
- Ou botão para selecionar arquivo
- Aceita apenas .csv
- Limite de tamanho: 10MB (configurável)
- Preview do nome do arquivo selecionado

Estado:
- idle: mostra área de drop
- dragging: highlight visual quando arrasta sobre
- uploading: barra de progresso
- processing: parsing o CSV
- preview: mostra dados parseados
- error: mostra mensagem de erro

Visual:
- Borda tracejada dourada
- Ícone de upload grande
- Texto: "Arraste um arquivo CSV aqui"
- Subtext: "ou clique para selecionar"

TESTE: Renderize componente. Arraste CSV sobre ele. Deve mudar visual e aceitar o arquivo.
```

### Prompt 1.2 - Criar utilitário de parsing CSV

```
Crie src/utils/csv-parser.ts usando PapaParse:

```typescript
interface ParsedCSV {
  columns: ColumnInfo[];
  data: any[];
  rowCount: number;
  errors: string[];
}

interface ColumnInfo {
  name: string;
  inferredType: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: any[];
  nullCount: number;
}

async function parseCSV(file: File): Promise<ParsedCSV>
function inferColumnType(values: any[]): ColumnInfo['inferredType']
function normalizeColumnName(name: string): string // remove espaços, caracteres especiais
function detectDelimiter(content: string): string // , ou ; ou \t
```

Inferência de tipo:
- Se todos parecem números → number
- Se parecem datas (pattern matching) → date
- Se true/false/sim/não → boolean
- Default → string

TESTE: Parse um CSV de exemplo. ColumnInfo deve ter tipos inferidos corretamente.
```

### Prompt 1.3 - Criar componente de preview do CSV

```
Crie src/components/data/CsvPreview.tsx:

Props:
- parsedData: ParsedCSV
- onConfirm: (tableName: string, columnMappings: ColumnMapping[]) => void
- onCancel: () => void

Features:
1. Mostrar preview das primeiras 10 linhas
2. Para cada coluna:
   - Nome (editável)
   - Tipo inferido (dropdown para corrigir)
   - Checkbox "incluir" (default: true)
3. Input para nome da tabela (sugestão baseada no nome do arquivo)
4. Validação:
   - Nome da tabela não pode ter espaços/caracteres especiais
   - Pelo menos 1 coluna selecionada
   - Pelo menos 1 linha de dados

Botões: "Cancelar" | "Criar tabela"

TESTE: Mostre preview de CSV parseado. Edite nomes de colunas. Confirme - deve chamar callback.
```

### Prompt 1.4 - Criar endpoint de importação no backend

```
Crie backend/src/routes/import.routes.ts:

Endpoint: POST /api/import/csv
- Multipart form data com arquivo
- Ou JSON com dados já parseados

Fluxo:
1. Receber dados e configuração
2. Criar tabela temporária no Supabase
3. Inserir dados em batch
4. Retornar info da tabela criada

```typescript
interface ImportRequest {
  tableName: string;
  columns: { name: string; type: string }[];
  data: any[][];
  isTemporary: boolean; // se true, deleta após 24h
}

interface ImportResponse {
  success: boolean;
  tableName: string;
  rowCount: number;
  tableId?: string;
}
```

TESTE: Envie POST com dados mock. Verifique que tabela foi criada no Supabase.
```

### Prompt 1.5 - Criar serviço de importação

```
Crie backend/src/services/import.service.ts:

```typescript
class ImportService {
  async createTableFromCSV(
    tableName: string,
    columns: ColumnDefinition[],
    data: any[][]
  ): Promise<{ tableName: string; rowCount: number }>
  
  async insertBatch(tableName: string, data: any[][], batchSize?: number): Promise<void>
  
  private generateCreateTableSQL(tableName: string, columns: ColumnDefinition[]): string
  
  private mapTypeToPostgres(type: string): string
  
  async dropTable(tableName: string): Promise<void>
  
  async listImportedTables(): Promise<ImportedTable[]>
}
```

Mapeamento de tipos:
- string → TEXT
- number → NUMERIC
- date → TIMESTAMPTZ
- boolean → BOOLEAN

BATCHSIZE default: 500 linhas por insert.

TESTE: Chame createTableFromCSV com dados mock. Tabela deve existir e ser consultável.
```

### Prompt 1.6 - Integrar upload no DashboardPage

```
Adicione opção de upload de CSV no DashboardPage:

1. Na sidebar, botão "+ Importar CSV" abaixo da lista de tabelas
2. Ao clicar, abre modal com CsvUploader
3. Após upload e preview, confirma importação
4. Nova tabela aparece na lista de tabelas com badge "Importado"
5. Toast de sucesso com contagem de linhas

Fluxo completo:
1. User clica "Importar CSV"
2. Modal com área de drag & drop
3. User arrasta/seleciona arquivo
4. Preview com opções de configuração
5. User confirma
6. Progress bar durante upload
7. Tabela aparece na lista
8. User pode usar no chat normalmente

TESTE: Importe um CSV pequeno. Deve aparecer como nova tabela utilizável.
```

### Prompt 1.7 - Marcar tabelas importadas como temporárias

```
Adicione gestão de tabelas temporárias:

1. Tabelas importadas têm opção "temporária" (default: true)
2. Tabelas temporárias são deletadas após 24h
3. No sidebar, tabelas temporárias têm ícone/badge diferente
4. Menu de contexto na tabela: "Tornar permanente" / "Deletar"

Backend:
- Cron job ou processo que limpa tabelas expiradas
- Ou: client-side cleanup ao carregar (verifica e limpa)

Metadata no Supabase:
- Adicionar tabela imported_tables com campos:
  - table_name
  - is_temporary
  - expires_at
  - source_filename

TESTE: Importe CSV como temporário. Veja badge. Use opção "Tornar permanente". Badge deve sumir.
```

### Prompt 1.8 - Validação e feedback de erros

```
Melhore o feedback de erros no upload:

Validações frontend:
1. Formato: só .csv
2. Tamanho: máx 10MB
3. Encoding: tentar detectar e converter para UTF-8
4. Delimitador: detectar automaticamente (, ; \t)

Validações backend:
1. Nomes de coluna válidos (sem duplicatas após normalização)
2. Tipos consistentes
3. Limite de colunas: 50
4. Limite de linhas: 100.000

Mensagens de erro claras:
- "Arquivo muito grande. Máximo permitido: 10MB"
- "Coluna 'nome' está duplicada"
- "Não foi possível detectar o delimitador. Use , ou ; "

TESTE: Tente fazer upload de arquivo inválido. Mensagem de erro deve ser clara e útil.
```

### Prompt 1.9 - Histórico de importações

```
Adicione visualização do histórico de importações:

Crie seção "Importações Recentes" (acessível via menu ou página):
- Lista tabelas importadas com:
  - Nome da tabela
  - Arquivo original
  - Data de importação
  - Número de linhas
  - Status (ativa, expirada, deletada)

Ações:
- Re-importar (se tiver arquivo salvo)
- Deletar tabela
- Ver dados

Page route: /imports

TESTE: Importe alguns CSVs. Navegue para /imports. Histórico deve estar lá.
```

### Prompt 1.10 - Arrastar CSV direto no chat

```
Adicione atalho para importar CSV arrastando direto para a área do chat:

1. Detectar drag de arquivo sobre chat area
2. Mostrar overlay "Solte para importar CSV"
3. Ao soltar, abrir modal de importação preenchido
4. Após importar, perguntar: "Tabela criada! O que gostaria de saber sobre esses dados?"

Isso cria fluxo mais rápido para usuários.

TESTE: Arraste CSV sobre a área do chat. Overlay deve aparecer. Soltar deve abrir importador.
```

---

## 🔌 PARTE 2: Preparação para Conectores

### Prompt 2.1 - Criar abstração de datasource

```
Crie backend/src/services/datasource.ts - abstração para múltiplas fontes:

```typescript
interface Datasource {
  id: string;
  name: string;
  type: 'supabase' | 'postgres' | 'mysql' | 'csv_import';
  connectionConfig?: any;
  isActive: boolean;
  createdAt: Date;
}

interface DatasourceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getTables(): Promise<TableInfo[]>;
  getTableData(tableName: string, options?: QueryOptions): Promise<any[]>;
  executeQuery(sql: string): Promise<any[]>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

// Adapter atual (Supabase)
class SupabaseDatasourceAdapter implements DatasourceAdapter { ... }

// Factory
function createDatasourceAdapter(config: Datasource): DatasourceAdapter
```

Isso prepara arquitetura para adicionar PostgreSQL, MySQL, etc depois.

TESTE: Refatore database.service para usar SupabaseDatasourceAdapter. Deve funcionar igual.
```

### Prompt 2.2 - Criar schema para datasources

```
Crie migration para armazenar configurações de conexão:

```sql
CREATE TABLE datasources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('supabase', 'postgres', 'mysql', 'sqlserver', 'csv_import')),
  connection_config JSONB, -- encrypted in production
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  tables_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configuração default do Supabase (criada automaticamente)
INSERT INTO datasources (name, type, is_active) 
VALUES ('Supabase Principal', 'supabase', true);
```

TESTE: Query na tabela datasources. Deve ter o registro default do Supabase.
```

### Prompt 2.3 - Criar selector de datasource no frontend

```
Crie src/components/data/DatasourceSelector.tsx:

Props:
- datasources: Datasource[]
- activeId: string
- onSelect: (id: string) => void
- onManage: () => void // abre página de gerenciamento

UI:
- Dropdown mostrando datasource ativo
- Lista de datasources disponíveis
- Status de conexão (ícone verde/vermelho)
- Link "Gerenciar conexões" no final

Posição: topo da sidebar, acima da lista de tabelas.

TESTE: Renderize com múltiplos datasources. Trocar deve atualizar lista de tabelas.
```

### Prompt 2.4 - Criar página de gerenciamento de conexões

```
Crie src/pages/ConnectionsPage.tsx:

Layout:
- Lista de conexões configuradas
- Botão "+ Nova conexão"
- Card para cada conexão com:
  - Nome
  - Tipo (ícone do banco)
  - Status de conexão
  - Última vez conectado
  - Número de tabelas
  - Ações: Testar, Editar, Deletar

Botões de ação:
- "Testar conexão" - verifica se está acessível
- "Sincronizar tabelas" - atualiza lista de tabelas
- "Editar" - abre modal de configuração
- "Deletar" - remove conexão

TESTE: Navegue para /connections. Deve mostrar Supabase como conexão default.
```

### Prompt 2.5 - Modal de nova conexão (UI only)

```
Crie src/components/data/NewConnectionModal.tsx:

Step 1 - Escolher tipo:
- Cards visuais para cada tipo suportado
- Supabase ✓ (habilitado)
- PostgreSQL (coming soon - disabled)
- MySQL (coming soon - disabled)
- SQL Server (coming soon - disabled)

Step 2 - Configurar (para Supabase):
- URL do projeto
- API Key
- Nome da conexão

Step 3 - Testar:
- Botão "Testar conexão"
- Feedback de sucesso/erro
- Mostrar tabelas encontradas

Step 4 - Confirmar:
- Resumo da configuração
- Botão "Criar conexão"

TESTE: Abra modal. Navegue pelos steps. Tipos disabled devem mostrar "Em breve".
```

### Prompt 2.6 - Implementar teste de conexão

```
Adicione endpoint para testar conexão:

POST /api/datasources/test
Body: { type: string, config: ConnectionConfig }
Response: { success: boolean, tables?: TableInfo[], error?: string }

Para Supabase:
1. Tentar conectar com credenciais fornecidas
2. Listar tabelas disponíveis
3. Retornar sucesso com contagem

Segurança:
- Não salvar credenciais até confirmar teste
- Timeout de 10 segundos
- Sanitizar mensagens de erro (não expor detalhes sensíveis)

TESTE: Chame endpoint com credenciais válidas. Deve retornar success: true e lista de tabelas.
```

### Prompt 2.7 - Multi-datasource no chat

```
Atualize o chat para suportar múltiplos datasources:

1. Ao iniciar chat, usar datasource ativo no seletor
2. Mensagens mostram de qual datasource vieram
3. Ao trocar datasource, avisar que contexto mudou
4. Histórico mantém referência ao datasource usado

No prompt da IA, incluir contexto:
"Você está conectado ao banco '[nome do datasource]' com as seguintes tabelas: ..."

TESTE: Configure 2 datasources. Troque entre eles. Chat deve usar tabelas do datasource ativo.
```

### Prompt 2.8 - Placeholder para PostgreSQL adapter

```
Crie backend/src/adapters/postgres.adapter.ts com implementação placeholder:

```typescript
class PostgresAdapter implements DatasourceAdapter {
  constructor(config: PostgresConfig) {
    // TODO: Implement
  }
  
  async connect(): Promise<void> {
    throw new Error('PostgreSQL adapter coming soon');
  }
  
  async disconnect(): Promise<void> {
    throw new Error('PostgreSQL adapter coming soon');
  }
  
  // ... outros métodos
}
```

Isso prepara a estrutura para implementação futura.

No NewConnectionModal, PostgreSQL fica disabled com tooltip "Em desenvolvimento".

TESTE: Selecionar PostgreSQL deve mostrar mensagem de "em breve", não crashar.
```

### Prompt 2.9 - Indicadores visuais de conexão

```
Adicione indicadores de status de conexão:

1. Pulsinho verde no seletor quando conectado
2. Badge amarelo se conexão lenta
3. Badge vermelho se desconectado
4. Auto-reconnect com retry exponencial

Status check:
- Verificar conexão periodicamente (a cada 5 min)
- Verificar antes de cada query importante
- Mostrar toast se conexão cair

No header do chat:
"🟢 Conectado a [datasource]" ou "🔴 Desconectado - Reconectando..."

TESTE: Desconecte da internet brevemente. Indicador deve mudar. Reconecte e deve voltar ao verde.
```

### Prompt 2.10 - Documentação de conectores

```
Crie página de documentação in-app para conectores:

Acessível via: /connections/help ou link "?" na página de conexões

Conteúdo:
- Como conectar Supabase (passo a passo com screenshots)
- Requisitos de cada tipo de banco
- Troubleshooting comum
- FAQ

Estrutura:
- Accordion expansível para cada tópico
- Busca dentro da documentação
- Links para docs externos

Isso ajuda usuários a se auto-servir.

TESTE: Navegue para página de ajuda. Conteúdo deve estar formatado e legível.
```

---

## ✅ Checklist de Verificação da Fase 6

Antes de passar para a Fase 7, verifique:

- [ ] Upload de CSV funciona (arrastar e soltar)
- [ ] Preview de CSV mostra colunas e tipos
- [ ] Edição de nomes de coluna funciona
- [ ] Importação cria tabela no Supabase
- [ ] Tabela importada aparece na lista
- [ ] Tabela pode ser usada no chat
- [ ] Tabelas temporárias têm badge
- [ ] Histórico de importações funciona
- [ ] Arrastar CSV no chat abre importador
- [ ] Abstração de datasource implementada
- [ ] Página de conexões mostra datasources
- [ ] Teste de conexão funciona
- [ ] Indicadores de status de conexão funcionam
- [ ] Nenhum erro no console
- [ ] Build de produção funciona
