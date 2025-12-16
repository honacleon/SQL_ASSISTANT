# 📋 Fase 5: Produtividade Avançada - Prompts para Tempo

## 🎯 Contexto Geral

```
Continuando o SQL Assistant. Já implementado: visual premium (Fase 1), experiência conversacional (Fase 2), gráficos (Fase 3), otimização de tokens e Knowledge Base (Fase 4).

Esta fase foca em:
1. Dashboards personalizados com drag-and-drop
2. Queries salvas e templates reutilizáveis

Dependência nova: react-grid-layout (para layout de dashboard)
```

---

## 📊 PARTE 1: Dashboards Personalizados

### Prompt 1.1 - Instalar dependência de layout

```
Instale a biblioteca para layout de dashboard drag-and-drop:

npm install react-grid-layout
npm install -D @types/react-grid-layout

Importe os estilos CSS necessários adicionando ao src/index.css:
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

TESTE: Importe { Responsive, WidthProvider } from 'react-grid-layout' em um arquivo. Não deve dar erro.
```

### Prompt 1.2 - Criar schema para dashboards

```
Crie backend/src/migrations/003_dashboards.sql:

```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('chart', 'metric', 'table', 'text')),
  title TEXT NOT NULL,
  query_text TEXT, -- pergunta em linguagem natural
  query_sql TEXT, -- SQL gerado (cache)
  chart_config JSONB,
  position JSONB NOT NULL, -- {x, y, w, h}
  refresh_interval INTEGER, -- segundos, null = sem auto-refresh
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_widgets_dashboard ON dashboard_widgets(dashboard_id);
```

Execute no Supabase SQL Editor.

TESTE: Insira dashboard de teste. Insira widget vinculado. Consulte - deve retornar corretamente.
```

### Prompt 1.3 - Criar serviço de Dashboard

```
Crie backend/src/services/dashboard.service.ts:

```typescript
interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: LayoutItem[];
  isDefault: boolean;
  isPublic: boolean;
  widgets?: Widget[];
}

interface Widget {
  id: string;
  dashboardId: string;
  type: 'chart' | 'metric' | 'table' | 'text';
  title: string;
  queryText?: string;
  querySql?: string;
  chartConfig?: ChartConfig;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval?: number;
}

class DashboardService {
  // Dashboards
  listDashboards(): Promise<Dashboard[]>
  getDashboard(id: string): Promise<Dashboard | null>
  createDashboard(data: Partial<Dashboard>): Promise<Dashboard>
  updateDashboard(id: string, data: Partial<Dashboard>): Promise<Dashboard>
  deleteDashboard(id: string): Promise<void>
  
  // Widgets
  addWidget(dashboardId: string, widget: Partial<Widget>): Promise<Widget>
  updateWidget(widgetId: string, data: Partial<Widget>): Promise<Widget>
  deleteWidget(widgetId: string): Promise<void>
  
  // Layout
  updateLayout(dashboardId: string, layout: LayoutItem[]): Promise<void>
}
```

TESTE: Crie dashboard via service. Adicione widgets. Liste - deve retornar tudo corretamente.
```

### Prompt 1.4 - Criar rotas de Dashboard

```
Crie backend/src/routes/dashboard.routes.ts:

Rotas:
1. GET /api/dashboards - listar dashboards
2. POST /api/dashboards - criar dashboard
3. GET /api/dashboards/:id - obter dashboard com widgets
4. PUT /api/dashboards/:id - atualizar dashboard
5. DELETE /api/dashboards/:id - deletar dashboard
6. POST /api/dashboards/:id/widgets - adicionar widget
7. PUT /api/dashboards/:id/widgets/:widgetId - atualizar widget
8. DELETE /api/dashboards/:id/widgets/:widgetId - remover widget
9. PUT /api/dashboards/:id/layout - atualizar layout (posições)

Registre em backend/src/index.ts:
app.use('/api/dashboards', authenticateApiKey, dashboardRoutes);

TESTE: Use Postman para criar dashboard e adicionar widgets. Deve funcionar sem erros.
```

### Prompt 1.5 - Criar página de lista de Dashboards

```
Crie src/pages/DashboardsPage.tsx (lista de dashboards):

Layout:
- Header com título "Meus Dashboards" e botão "+ Novo Dashboard"
- Grid de cards, cada um representando um dashboard
- Card mostra: nome, descrição, número de widgets, última atualização

Card actions:
- Click abre o dashboard
- Menu dropdown: Editar, Duplicar, Deletar
- Badge se é default
- Badge se é público

Botão "Novo Dashboard":
- Abre modal para criar (nome + descrição)
- Ao criar, navega para editor

TESTE: Navegue para /dashboards. Deve mostrar lista (vazia inicialmente). Crie um novo.
```

### Prompt 1.6 - Criar componente DashboardGrid

```
Crie src/components/dashboard/DashboardGrid.tsx usando react-grid-layout:

Props:
- layout: LayoutItem[]
- widgets: Widget[]
- onLayoutChange: (layout: LayoutItem[]) => void
- isEditing: boolean
- onWidgetClick?: (widgetId: string) => void

Features:
- ResponsiveGridLayout para adaptar em diferentes telas
- Drag and drop quando isEditing=true
- Resize de widgets quando isEditing=true
- Snap to grid
- Breakpoints para mobile, tablet, desktop

Cada célula renderiza o Widget correspondente baseado no ID.

TESTE: Renderize grid com 3 widgets placeholder. Deve conseguir arrastar e redimensionar em modo edição.
```

### Prompt 1.7 - Criar componente Widget

```
Crie src/components/dashboard/Widget.tsx:

Props:
- widget: Widget
- isEditing: boolean
- onRemove: () => void
- onEdit: () => void
- onRefresh: () => void

Renderiza conteúdo baseado em widget.type:
- 'chart': renderiza ChartContainer com gráfico
- 'metric': renderiza número grande com label
- 'table': renderiza DataTable compacta
- 'text': renderiza markdown/texto

Header do widget:
- Título
- Menu (editar, remover) - visível só em isEditing
- Botão refresh (se auto-refresh configurado)
- Indicador de loading

Visual: card com glass effect, bordas douradas sutis.

TESTE: Renderize diferentes tipos de widget. Cada um deve ter aparência apropriada.
```

### Prompt 1.8 - Criar componente MetricWidget

```
Crie src/components/dashboard/MetricWidget.tsx para exibir KPIs:

Props:
- value: number | string
- label: string
- change?: { value: number; isPositive: boolean } (ex: +15%)
- icon?: React.ReactNode
- formatAs?: 'number' | 'currency' | 'percent'

Visual:
- Valor grande e proeminente (fonte dourada se positivo)
- Label menor abaixo
- Change indicator: seta up/down com cor apropriada
- Ícone decorativo opcional

Animação:
- Counter animation ao valor mudar
- Fade in ao aparecer

TESTE: Renderize MetricWidget com value=1000 e change={value: 15, isPositive: true}. Deve mostrar bonito.
```

### Prompt 1.9 - Criar página de visualização de Dashboard

```
Crie src/pages/DashboardViewPage.tsx:

URL: /dashboards/:id

Layout:
- Header com nome do dashboard e botão "Editar"
- DashboardGrid ocupando o resto da tela
- Carrega dashboard e widgets do backend
- Executa queries de cada widget ao carregar

Features:
- Loading skeleton enquanto carrega
- Error state se dashboard não encontrado
- Auto-refresh de widgets (se configurado)
- Fullscreen mode (F11 ou botão)

TESTE: Crie dashboard com widgets. Navegue para /dashboards/:id. Deve renderizar com dados reais.
```

### Prompt 1.10 - Criar página de edição de Dashboard

```
Crie src/pages/DashboardEditorPage.tsx:

URL: /dashboards/:id/edit

Layout:
- Header com nome (editável inline) e botões Save/Cancel
- DashboardGrid em modo edição (isEditing=true)
- Sidebar/Panel com:
  - Lista de widgets disponíveis para adicionar
  - Configurações do dashboard

Adicionar widget:
- Botão "+ Adicionar Widget" abre modal
- Escolher tipo (chart, metric, table, text)
- Para chart/metric/table: input de query
- Preview antes de adicionar
- Confirma → adiciona ao grid

Remover widget:
- Botão X no widget ou drag para área de "lixeira"

TESTE: Edite um dashboard. Adicione widgets diferentes. Reordene. Salve. Recarregue - deve persistir.
```

### Prompt 1.11 - Modal de configuração de Widget

```
Crie src/components/dashboard/WidgetEditor.tsx - modal para configurar widget:

Para todos os tipos:
- Título (input)
- Tamanho sugerido (dropdown: pequeno, médio, grande)

Para chart/metric/table:
- Query em linguagem natural (textarea)
- Botão "Executar" para preview
- Preview da visualização

Para chart:
- Tipo de gráfico (bar, line, pie)
- Cores opcionais
- Mostrar legenda (toggle)

Para text:
- Textarea com markdown
- Preview do markdown renderizado

Botões: Cancelar | Salvar

TESTE: Abra editor de widget. Configure query. Veja preview. Salve e verifique que aparece no dashboard.
```

### Prompt 1.12 - Auto-refresh de widgets

```
Implemente auto-refresh de widgets:

1. No Widget.tsx, se refreshInterval definido:
   - Iniciar timer ao montar
   - Re-executar query periodicamente
   - Mostrar indicador de "última atualização"
   - Pausar se aba não está visível (Page Visibility API)

2. No WidgetEditor, adicionar opção:
   - "Auto-atualizar" (toggle)
   - "Intervalo" (dropdown: 30s, 1min, 5min, 15min)

3. Indicador visual:
   - Pequeno badge mostrando "atualizado há Xs"
   - Spinner sutil durante atualização

TESTE: Configure widget com refresh de 30s. Aguarde 30s. Widget deve atualizar dados automaticamente.
```

---

## 📝 PARTE 2: Queries Salvas e Templates

### Prompt 2.1 - Criar schema para queries salvas

```
Adicione ao migrations/003_dashboards.sql (ou crie novo):

```sql
CREATE TABLE saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  natural_language TEXT NOT NULL,
  sql_generated TEXT,
  table_context TEXT,
  parameters JSONB DEFAULT '[]', -- parâmetros variáveis
  is_template BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_queries_favorite ON saved_queries(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_saved_queries_usage ON saved_queries(usage_count DESC);
```

TESTE: Insira query salva de teste. Consulte - deve retornar corretamente.
```

### Prompt 2.2 - Criar serviço de Saved Queries

```
Crie backend/src/services/saved-queries.service.ts:

```typescript
interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  naturalLanguage: string;
  sqlGenerated?: string;
  tableContext?: string;
  parameters?: QueryParameter[];
  isTemplate: boolean;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: Date;
}

interface QueryParameter {
  name: string;
  type: 'date' | 'string' | 'number' | 'select';
  defaultValue?: any;
  options?: any[]; // para select
  required: boolean;
}

class SavedQueriesService {
  list(options?: { favorites?: boolean; templates?: boolean }): Promise<SavedQuery[]>
  get(id: string): Promise<SavedQuery | null>
  create(query: Partial<SavedQuery>): Promise<SavedQuery>
  update(id: string, data: Partial<SavedQuery>): Promise<SavedQuery>
  delete(id: string): Promise<void>
  
  toggleFavorite(id: string): Promise<SavedQuery>
  incrementUsage(id: string): Promise<void>
  
  // Para templates com parâmetros
  applyParameters(queryId: string, params: Record<string, any>): Promise<string>
}
```

TESTE: Crie query via service. Marque como favorita. Liste favoritas - deve retornar.
```

### Prompt 2.3 - Criar rotas de Saved Queries

```
Crie backend/src/routes/saved-queries.routes.ts:

Rotas:
1. GET /api/queries - listar queries (query params: favorites, templates)
2. POST /api/queries - criar query
3. GET /api/queries/:id - obter query específica
4. PUT /api/queries/:id - atualizar query
5. DELETE /api/queries/:id - deletar query
6. POST /api/queries/:id/favorite - toggle favorito
7. POST /api/queries/:id/execute - executar query (incrementa usage)
8. POST /api/queries/:id/from-template - criar a partir de template com params

Registre em index.ts.

TESTE: CRUD completo via Postman. Toggle favorito. Execute e verifique incremento do usage.
```

### Prompt 2.4 - Adicionar opção de salvar query no chat

```
Modifique ChatInterface.tsx para permitir salvar queries:

Após resposta bem-sucedida que gerou dados:
1. Adicione botão "💾 Salvar query" abaixo da resposta
2. Ao clicar, abre modal para dar nome e descrição
3. Salva a pergunta e SQL gerado
4. Toast de sucesso com link para ver queries salvas

Modal de salvar:
- Input: Nome da query
- Textarea: Descrição (opcional)
- Checkbox: Marcar como favorita
- Checkbox: Salvar como template (se tiver parâmetros detectáveis)

TESTE: Faça pergunta no chat. Clique em salvar. Dê nome. Verifique que aparece na lista de queries.
```

### Prompt 2.5 - Criar painel de Saved Queries

```
Crie src/components/queries/SavedQueriesPanel.tsx:

Layout:
- Tabs: "Recentes" | "Favoritas" | "Templates"
- Lista de queries com:
  - Nome
  - Preview da pergunta (truncado)
  - Tabela em contexto
  - Última vez usada
- Hover mostra ações: Executar, Editar, Deletar, Favoritar

Executar query:
- Click simples executa no chat ativo
- Preenche input e envia automaticamente
- Ou abre como nova aba

TESTE: Tenha queries salvas. Abra painel. Click em uma deve executar no chat.
```

### Prompt 2.6 - Integrar painel na sidebar

```
Modifique DashboardPage.tsx para incluir painel de queries:

Adicione seção "Queries Salvas" na sidebar, abaixo de "Conversas":
- Ícone de bookmark/star
- Mostra 5 queries mais usadas
- Link "Ver todas" → expande ou abre página dedicada

Atalho de teclado:
- Ctrl+K abre busca rápida de queries
- Digite para filtrar
- Enter executa a selecionada

TESTE: Pressione Ctrl+K. Digite parte do nome de uma query salva. Enter deve executá-la.
```

### Prompt 2.7 - Sistema de Templates com parâmetros

```
Implemente templates com parâmetros variáveis:

1. Na query, permitir sintaxe {{parametro}}:
   "Vendas de {{produto}} no período de {{data_inicio}} a {{data_fim}}"

2. Ao salvar como template, detectar parâmetros automaticamente
3. Para cada parâmetro, definir tipo e configuração

4. Ao executar template:
   - Mostrar formulário pedindo valores
   - Substituir placeholders
   - Executar query resultante

UI do formulário:
- Para date: date picker
- Para select: dropdown com opções
- Para number: input numérico
- Para string: input texto

TESTE: Salve query com {{mes}} como template. Execute. Formulário deve pedir o mês. Executar deve usar o valor.
```

### Prompt 2.8 - Página dedicada de Queries

```
Crie src/pages/QueriesPage.tsx:

Layout:
- Header com "Minhas Queries" e botão "Nova Query Manual"
- Barra de busca
- Grid de cards com queries

Card de query:
- Nome
- Descrição
- Tags (tabela em contexto, favorita, template)
- Estatísticas: vezes usada, última vez
- Preview do SQL (expansível)

Ações:
- Executar (abre no chat ou nova aba)
- Editar (modal de edição)
- Duplicar
- Deletar

Filtros:
- Por tabela
- Favoritas
- Templates
- Mais usadas

TESTE: Navegue para /queries. Deve mostrar todas as queries. Filtros devem funcionar.
```

### Prompt 2.9 - Sugestão de queries baseada em contexto

```
Adicione sugestões inteligentes de queries salvas:

1. Ao selecionar tabela, mostrar queries relevantes:
   - Que usam essa tabela
   - Mais frequentemente usadas
   - Sugeridas para este contexto

2. Após resposta do chat, sugerir queries relacionadas:
   - "Você também pode gostar: [query X], [query Y]"
   - Baseado em similaridade de tema

3. No input vazio, mostrar queries recentes como sugestão stada:
   - Chips clicáveis com nomes das queries
   - Limite de 3-5 sugestões

TESTE: Selecione tabela que tem queries salvas. Sugestões devem aparecer relevantes.
```

### Prompt 2.10 - Navegação entre páginas

```
Atualize App.tsx e navegação para incluir novas páginas:

Rotas:
- / - Home
- /dashboard - Chat (renomear para /chat?)
- /dashboards - Lista de dashboards
- /dashboards/:id - Ver dashboard
- /dashboards/:id/edit - Editar dashboard
- /queries - Queries salvas
- /knowledge - Knowledge Base
- /settings - Configurações (futuro)

Navegação:
- Sidebar persistente em todas as páginas internas
- Ou: top navigation bar

Links:
- Chat / Dashboards / Queries / Knowledge Base

TESTE: Navegue entre todas as páginas. Links devem funcionar. Layout consistente.
```

---

## ✅ Checklist de Verificação da Fase 5

Antes de passar para a Fase 6, verifique:

- [ ] react-grid-layout instalado e funcionando
- [ ] Tabelas de dashboard e widgets criadas
- [ ] CRUD de dashboards funcionando
- [ ] Grid drag-and-drop funcionando
- [ ] Widgets de chart, metric, table renderizando
- [ ] Editor de widget com preview
- [ ] Auto-refresh de widgets funcionando
- [ ] Queries podem ser salvas do chat
- [ ] Lista de queries salvas funciona
- [ ] Busca rápida (Ctrl+K) funciona
- [ ] Templates com parâmetros funcionam
- [ ] Navegação entre páginas consistente
- [ ] Nenhum erro no console
- [ ] Build de produção funciona
