# 📋 Fase 3: Visualização de Dados - Prompts para Tempo

## 🎯 Contexto Geral

```
Continuando o SQL Assistant. Temas implementados: visual premium (Fase 1), respostas proativas e abas (Fase 2).

Agora o foco é adicionar visualização de dados com gráficos interativos e exportação em múltiplos formatos.

Stack de gráficos: Recharts (precisa instalar)
Stack de exportação: Papa Parse (CSV), SheetJS (Excel), html2canvas + jsPDF (imagem/PDF)
```

---

## 📊 PARTE 1: Gráficos Interativos

### Prompt 1.1 - Instalar dependências de gráficos

```
Instale as dependências necessárias para gráficos e exportação:

npm install recharts papaparse xlsx html2canvas jspdf

Após instalar, crie os tipos necessários:
npm install -D @types/papaparse

TESTE: Importe { LineChart } from 'recharts' em qualquer arquivo. Não deve dar erro de tipo.
```

### Prompt 1.2 - Criar container de gráfico responsivo

```
Crie src/components/charts/ChartContainer.tsx - container responsivo para gráficos:

Props:
- title: string
- subtitle?: string
- children: React.ReactNode (o gráfico)
- loading?: boolean
- error?: string
- onExport?: () => void
- className?: string

Features:
- Header com título e botão de exportar
- Loading overlay quando loading=true
- Mensagem de erro quando error presente
- ResponsiveContainer do Recharts envolvendo children
- Visual premium (glass card, bordas douradas)

Dimensões:
- Altura default: 300px
- Largura: 100% do container

TESTE: Renderize ChartContainer com um div placeholder dentro. Deve mostrar card com título e área para gráfico.
```

### Prompt 1.3 - Criar componente BarChart

```
Crie src/components/charts/BarChart.tsx usando Recharts:

Props:
- data: Array<{ name: string; value: number; [key: string]: any }>
- xKey?: string (default: 'name')
- yKey?: string (default: 'value')
- color?: string (default: cor dourada)
- showGrid?: boolean
- showTooltip?: boolean
- animate?: boolean

Features:
- Barras com gradiente dourado
- Tooltip customizado com estilo premium
- Grid sutil quando showGrid=true
- Animação de entrada quando animate=true
- Labels no eixo X rotacionados se muitos items

Cores do tema:
- Barra: gradiente de gold-500 para gold-600
- Grid: border color do tema
- Tooltip: glass card style

TESTE: Renderize BarChart com dados mock [{ name: 'A', value: 10 }, { name: 'B', value: 20 }]. Deve mostrar gráfico de barras dourado.
```

### Prompt 1.4 - Criar componente LineChart

```
Crie src/components/charts/LineChart.tsx usando Recharts:

Props:
- data: Array<{ date: string; value: number; [key: string]: any }>
- xKey?: string (default: 'date')
- yKey?: string | string[] (suporta múltiplas linhas)
- colors?: string[] (default: [gold, champagne])
- showGrid?: boolean
- showArea?: boolean (preenche área sob a linha)
- showDots?: boolean

Features:
- Linha suave com stroke dourado
- Área preenchida com gradiente quando showArea=true
- Dots nos pontos de dados quando showDots=true
- Tooltip mostrando data e valor formatado
- Eixo X com datas formatadas

TESTE: Renderize com dados temporais mock. Deve mostrar linha de tendência elegante.
```

### Prompt 1.5 - Criar componente PieChart

```
Crie src/components/charts/PieChart.tsx usando Recharts:

Props:
- data: Array<{ name: string; value: number }>
- colors?: string[] (paleta dourada por default)
- showLabels?: boolean
- showLegend?: boolean
- innerRadius?: number (0 para pizza, >0 para donut)

Features:
- Fatias com cores da paleta dourada/champanhe
- Labels com percentual (%)
- Legenda lateral quando showLegend=true
- Animação de entrada
- Hover effect que destaca a fatia

Paleta de cores sugerida:
['#d4a418', '#d9b84d', '#d4c9a3', '#ecc94b', '#b88a14']

TESTE: Renderize com 4 categorias mock. Deve mostrar pizza com cores harmoniosas e legendas.
```

### Prompt 1.6 - Criar serviço de sugestão de gráfico

```
Crie src/services/chart-suggester.ts que analisa dados e sugere tipo de gráfico:

```typescript
interface ChartSuggestion {
  type: 'bar' | 'line' | 'pie' | 'table' | 'metric';
  xKey: string;
  yKey: string;
  reason: string;
  confidence: number; // 0-1
}

function suggestChartType(data: any[], question?: string): ChartSuggestion
```

Regras de detecção:
1. Se dados têm coluna data/date/time → LineChart
2. Se apenas 2-5 categorias com valores → PieChart
3. Se 6-15 categorias com valores → BarChart
4. Se mais de 15 linhas → Table (sem gráfico)
5. Se apenas 1 linha com 1 número → Metric (valor grande)

Detecte o tipo da coluna:
- isDateColumn(): verifica se parece data
- isNumericColumn(): verifica se é número
- isCategoricalColumn(): verifica se é texto com poucos valores únicos

TESTE: Chame com dados diversos. Sugestões devem fazer sentido para cada tipo de dado.
```

### Prompt 1.7 - Integrar gráficos no chat

```
Modifique o ChatInterface.tsx para renderizar gráficos nas respostas:

1. Detecte se resposta contém dados tabulares
2. Chame chart-suggester para obter sugestão
3. Se confiança > 0.7, renderize gráfico automaticamente
4. Adicione toggle para alternar entre tabela e gráfico
5. Posicione abaixo do texto da resposta

Estrutura da mensagem com gráfico:
```
[Mensagem de texto]
[Toggle: 📊 Gráfico | 📋 Tabela]
[Área do gráfico ou tabela]
```

Guarde dados estruturados no metadata da mensagem para renderizar.

TESTE: Pergunte algo que retorne dados numéricos. Deve aparecer gráfico automaticamente abaixo da resposta.
```

### Prompt 1.8 - Adicionar botão de gráfico manual

```
Adicione opção para gerar gráfico manualmente quando não gerado automaticamente:

1. Abaixo de respostas com dados, adicione botão "📊 Visualizar como gráfico"
2. Ao clicar, abre modal/drawer com opções:
   - Tipo de gráfico (bar, line, pie)
   - Qual coluna usar no eixo X
   - Qual coluna usar no eixo Y
3. Preview do gráfico no modal
4. Botão "Adicionar ao chat" insere gráfico na conversa

Use o Drawer do shadcn para o editor de gráfico.

TESTE: Obtenha resposta com dados. Clique em "Visualizar como gráfico". Configure e veja preview.
```

### Prompt 1.9 - Adicionar interatividade nos gráficos

```
Melhore a interatividade dos gráficos:

1. Tooltip rico mostrando todos os dados do ponto
2. Click em barra/fatia/ponto filtra dados (opcional)
3. Zoom horizontal em LineChart para séries longas
4. Brush (seletor de range) para filtrar período
5. Legend clicável para hide/show séries

Para tooltips:
- Fundo glass card
- Borda dourada sutil
- Formatação de números (1000 → 1K, etc)
- Data formatada localmente

TESTE: Passe o mouse sobre elementos do gráfico. Tooltips devem aparecer bonitos e informativos.
```

### Prompt 1.10 - Criar DataViz wrapper para respostas

```
Crie src/components/data/DataViz.tsx que encapsula a lógica de visualização:

Props:
- data: any[]
- question: string (pergunta original para contexto)
- defaultView?: 'chart' | 'table'
- onExport?: (format: string) => void

Features:
- Detecta automaticamente melhor visualização
- Toggle entre chart/table
- Passa dados corretos para cada tipo de gráfico
- Fallback para tabela se gráfico não aplicável
- Indicador visual do tipo detectado

Este componente simplifica a integração no ChatInterface.

TESTE: Renderize DataViz com dados diversos. Deve escolher visualização apropriada automaticamente.
```

---

## 📤 PARTE 2: Exportação de Dados

### Prompt 2.1 - Criar utilitários de exportação

```
Crie src/utils/exporters.ts com funções de exportação:

```typescript
// CSV usando PapaParse
export function exportToCSV(data: any[], filename: string): void

// Excel usando SheetJS
export function exportToExcel(data: any[], filename: string, sheetName?: string): void

// JSON
export function exportToJSON(data: any[], filename: string): void

// Imagem de elemento HTML
export async function exportToImage(element: HTMLElement, filename: string): Promise<void>

// PDF de elemento HTML
export async function exportToPDF(element: HTMLElement, filename: string): Promise<void>
```

Cada função deve:
- Formatar dados apropriadamente
- Gerar arquivo e disparar download
- Tratar erros com try/catch
- Logar sucesso/erro

TESTE: Importe exportToCSV e chame com dados mock. Deve baixar arquivo CSV válido.
```

### Prompt 2.2 - Criar componente ExportMenu

```
Crie src/components/data/ExportMenu.tsx - dropdown de exportação:

Props:
- data: any[]
- filename?: string (default: 'export-{timestamp}')
- chartRef?: React.RefObject<HTMLDivElement> (para exportar gráfico)
- disabled?: boolean

Features:
- Dropdown com ícone de download
- Opções: CSV, Excel, JSON
- Se chartRef fornecido, adicionar: PNG, PDF
- Loading state enquanto exporta
- Toast de sucesso/erro após exportar

Visual:
- Botão com estilo outline e ícone Download
- Menu com ícones para cada formato
- Hover com highlight dourado

TESTE: Renderize ExportMenu com dados. Clique em cada opção. Arquivos devem baixar corretamente.
```

### Prompt 2.3 - Integrar exportação na DataTable

```
Modifique o componente DataTable em src/components/data/DataTable.tsx:

1. Adicione prop onExport?: (format: string) => void
2. Adicione ExportMenu no header da tabela, ao lado de outros controles
3. Passe os dados atuais (filtrados/ordenados) para o ExportMenu
4. Nome do arquivo deve incluir nome da tabela se disponível

Posição: canto superior direito do header da table.

TESTE: No preview de tabela, o botão de exportar deve estar visível. Exportar CSV deve conter os dados visíveis.
```

### Prompt 2.4 - Integrar exportação nos gráficos

```
Modifique ChartContainer.tsx para suportar exportação:

1. Adicione ref ao container do gráfico
2. Passe ref para ExportMenu
3. Habilite opções de imagem (PNG) e PDF
4. Ao exportar imagem, capture apenas a área do gráfico

Adicione também botão de "fullscreen" no gráfico:
- Expande gráfico para modal fullscreen
- Melhor visualização antes de exportar
- Botão de exportar no modo fullscreen

TESTE: Expanda gráfico para fullscreen. Exporte como PNG. Imagem deve conter apenas o gráfico em boa qualidade.
```

### Prompt 2.5 - Exportar resposta completa do chat

```
Adicione opção de exportar resposta completa (texto + dados + gráfico):

Crie src/utils/response-exporter.ts:
- exportChatResponse(message: ChatMessage, chartRef?: RefObject): Promise<void>
- Gera documento com:
  - Pergunta original
  - Resposta em texto
  - Dados em tabela
  - Gráfico como imagem

Formatos suportados: PDF (mais útil para relatórios)

No ChatInterface, adicione menu de contexto na mensagem:
- Copiar texto
- Exportar como PDF
- Compartilhar (link, se implementar depois)

TESTE: Clique direito em uma resposta com dados. "Exportar como PDF" deve gerar documento completo.
```

### Prompt 2.6 - Adicionar formatação de dados na exportação

```
Melhore a formatação nas exportações:

1. Datas formatadas para locale do usuário
2. Números com separadores de milhar
3. Valores monetários com símbolo (R$)
4. Booleanos como Sim/Não
5. Null/undefined como texto vazio

Crie src/utils/data-formatter.ts:
```typescript
function formatValue(value: any, type?: string): string
function detectColumnType(values: any[]): 'date' | 'number' | 'currency' | 'boolean' | 'text'
function formatDataForExport(data: any[]): any[]
```

Aplique formatação em todas as funções de exportação.

TESTE: Exporte dados com datas e números. No arquivo, valores devem estar formatados legível.
```

### Prompt 2.7 - Progress indicator para exportações lentas

```
Adicione feedback visual para exportações que demoram:

1. Para arquivos pequenos: toast de sucesso instantâneo
2. Para arquivos grandes ou PDF: 
   - Mostrar progress bar
   - Texto "Gerando exportação..."
   - Botão de cancelar (se possível)

Use o Toast do react-hot-toast com opção de loading.

Detecte tamanho: se > 1000 linhas, use modo com progress.

TESTE: Exporte dataset grande (se possível, crie dados mock grandes). Progress deve aparecer antes do download.
```

### Prompt 2.8 - Histórico de exportações

```
Adicione registro de exportações realizadas:

1. No localStorage, guarde últimas 10 exportações:
   - timestamp
   - formato
   - filename
   - número de linhas
   
2. No ExportMenu, adicione seção "Recentes" (se houver):
   - Mostra últimas 3 exportações
   - Click regenera mesma exportação (se dados ainda disponíveis)

3. Ícone de clock ao lado de cada item recente

TESTE: Faça 3 exportações. Reabra o menu. "Recentes" deve mostrar os últimos 3 arquivos.
```

### Prompt 2.9 - Copiar dados para clipboard

```
Adicione opção de copiar dados para clipboard:

No ExportMenu, adicione opção "📋 Copiar para área de transferência":
- Formata como texto tabular (TSV - tab separated)
- Pode colar direto no Excel/Sheets
- Toast de sucesso "Dados copiados! Cole em uma planilha."

Também adicione botão de copiar individual na tabela:
- Ícone de copiar em cada célula (visível no hover)
- Copia valor da célula

Use navigator.clipboard.writeText().

TESTE: Clique em "Copiar para área de transferência". Cole no Excel. Dados devem aparecer em colunas corretas.
```

### Prompt 2.10 - Compartilhamento via link (preparação)

```
Prepare infraestrutura para compartilhamento futuro:

1. Crie interface para "exportação compartilhável":
```typescript
interface ShareableExport {
  id: string;
  data: any[];
  chartConfig?: ChartConfig;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
}
```

2. Adicione botão "🔗 Gerar link" (disabled por enquanto) no ExportMenu
3. Tooltip: "Em breve: compartilhe visualizações via link"

Isso prepara para fase futura de compartilhamento.

TESTE: Botão de link deve aparecer desabilitado com tooltip explicativo.
```

---

## ✅ Checklist de Verificação da Fase 3

Antes de passar para a Fase 4, verifique:

- [ ] Dependências instaladas (recharts, papaparse, xlsx, etc)
- [ ] BarChart renderiza corretamente
- [ ] LineChart renderiza corretamente  
- [ ] PieChart renderiza corretamente
- [ ] Sugestão automática de tipo de gráfico funciona
- [ ] Gráficos aparecem nas respostas do chat
- [ ] Toggle entre gráfico e tabela funciona
- [ ] Exportação CSV funciona
- [ ] Exportação Excel funciona
- [ ] Exportação de gráfico como imagem funciona
- [ ] Exportação PDF funciona
- [ ] Dados formatados corretamente na exportação
- [ ] Copiar para clipboard funciona
- [ ] Nenhum erro no console
- [ ] Build de produção funciona
