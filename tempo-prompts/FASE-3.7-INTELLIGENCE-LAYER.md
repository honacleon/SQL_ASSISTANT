# 🎯 FASE 3.7: Intelligence Layer

## Objetivo
Melhorar precisão das queries e respostas com classificação de intent.

---

## Tarefas

### 3.7.1 Intent Classifier

Classificar intenção do usuário antes de gerar SQL.

**Arquivo:** `src/services/intent-classifier.ts`

**Tipos de Intent:**
```typescript
enum QueryIntent {
  DATA_RETRIEVAL = 'data_retrieval',   // "Mostre dados de X"
  AGGREGATION = 'aggregation',         // "Quantos/Soma/Média de X"
  FILTERING = 'filtering',             // "Dados onde X > Y"
  TREND = 'trend',                     // "Evolução de X ao longo do tempo"
  COMPARISON = 'comparison',           // "Compare X vs Y"
  EXPLORATORY = 'exploratory'          // "O que tem na tabela X?"
}
```

**Regex Patterns (Custo $0):**
```typescript
function classifyIntent(question: string): QueryIntent {
  const q = question.toLowerCase();
  
  // Agregação
  if (/quantos|quanto|total|soma|média|contagem|count|somar/i.test(q)) {
    return QueryIntent.AGGREGATION;
  }
  
  // Filtro
  if (/onde|filtr|apenas|só|somente|maior|menor|acima|abaixo|entre/i.test(q)) {
    return QueryIntent.FILTERING;
  }
  
  // Tendência
  if (/evolução|histórico|ao longo|crescimento|tendência|variação|por mês|por dia/i.test(q)) {
    return QueryIntent.TREND;
  }
  
  // Comparação
  if (/compare|versus|vs|diferença|entre.*e/i.test(q)) {
    return QueryIntent.COMPARISON;
  }
  
  // Exploratório
  if (/o que|quais|explore|analise|mostre tudo|estrutura/i.test(q)) {
    return QueryIntent.EXPLORATORY;
  }
  
  // Default
  return QueryIntent.DATA_RETRIEVAL;
}
```

**Uso no Backend:**
- Prompt otimizado por intent
- Validação específica por tipo de query
- Chart selection baseado no intent

---

### 3.7.2 Enhanced Chart Selection

Melhorar seleção de gráficos com base no intent.

**Modificar:** `src/services/chart-suggester.ts`

**Regras por Intent:**
```typescript
function selectChartByIntent(
  data: any[], 
  intent: QueryIntent,
  columns: ColumnInfo[]
): ChartConfig {
  
  // TREND → sempre Line chart
  if (intent === QueryIntent.TREND && hasDateColumn(columns)) {
    return { type: 'line', smooth: true, showArea: true };
  }
  
  // AGGREGATION com categoria → Donut ou Bar
  if (intent === QueryIntent.AGGREGATION) {
    const categoryCount = countUniqueCategories(data);
    
    if (categoryCount <= 6) {
      return { type: 'pie', showPercentages: true };
    } else if (categoryCount <= 15) {
      return { type: 'bar', sortBy: 'value' };
    } else {
      // Top 10 + "Outros"
      return { type: 'bar', limit: 10, showOthers: true };
    }
  }
  
  // COMPARISON → Grouped Bar
  if (intent === QueryIntent.COMPARISON) {
    return { type: 'bar', grouped: true };
  }
  
  // FILTERING ou DATA_RETRIEVAL → Tabela
  if (intent === QueryIntent.FILTERING || intent === QueryIntent.DATA_RETRIEVAL) {
    if (hasDateColumn(columns) && hasNumericColumn(columns)) {
      return { type: 'line' };
    }
    return { type: 'table' };
  }
  
  // Fallback
  return { type: 'table' };
}
```

---

## Verificação

- [ ] Intent é classificado corretamente para cada tipo de pergunta
- [ ] "Quantos pedidos?" → AGGREGATION
- [ ] "Mostre dados de orders" → DATA_RETRIEVAL
- [ ] "Evolução de vendas" → TREND
- [ ] Chart selection usa intent para escolher gráfico
- [ ] TREND sempre mostra Line chart
- [ ] AGGREGATION mostra Donut/Bar

---

## Estimativa
**Tempo:** 1-2 dias
**Custo adicional:** $0 (regex puro)
