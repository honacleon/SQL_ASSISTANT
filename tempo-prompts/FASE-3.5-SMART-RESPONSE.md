# 🎯 FASE 3.5: Smart Response (Formatação Inteligente)

## Objetivo
Transformar dados brutos em informação bonita e legível, aumentando o "wow factor" visual.

## Decisões Confirmadas
- Formato de data: **10/12/2025 14:30**
- IDs ficam ocultos na exibição

---

## Tarefas

### 3.5.1 Data Formatter Service

Criar serviço para formatar dados automaticamente.

**Arquivo:** `src/services/data-formatter.ts`

**Regras de Formatação:**

```typescript
// Regras por padrão de nome de coluna
const formatRules = {
  // Monetário (cents → BRL)
  cents: (value: number) => `R$ ${(value / 100).toFixed(2).replace('.', ',')}`,
  amount: (value: number) => `R$ ${(value / 100).toFixed(2).replace('.', ',')}`,
  
  // Status (enum → emoji + label)
  status: (value: string) => {
    const map = {
      'completed': '✅ Completo',
      'pending': '⏳ Pendente',
      'paid': '💰 Pago',
      'failed': '❌ Falhou',
      'cancelled': '🚫 Cancelado'
    };
    return map[value] || value;
  },
  
  // Timestamps (ISO → DD/MM/YYYY HH:MM)
  timestamp: (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('pt-BR') + ' ' + 
           date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },
  
  // Percentuais
  percent: (value: number) => `${value.toFixed(1)}%`,
  rate: (value: number) => `${(value * 100).toFixed(1)}%`,
  
  // IDs (ocultar)
  id: (value: string) => ({ value, hidden: true })
};
```

**Testes:**
```typescript
// Input
{ total_cents: 2500, status: 'paid', created_at: '2025-12-10T21:14:35Z' }

// Output
{ total_cents: 'R$ 25,00', status: '💰 Pago', created_at: '10/12/2025 21:14' }
```

---

### 3.5.2 Follow-up Suggester

Gerar 2 sugestões de perguntas contextuais.

**Arquivo:** `backend/src/services/follow-up-suggester.ts`

**Prompt LLM:**
```
Baseado nesta query SQL e resultados, sugira 2 perguntas de follow-up relevantes.

QUERY: "${sql}"
TABELAS: ${tables.join(', ')}
RESULTADO: ${rowCount} registros
PERGUNTA ORIGINAL: "${question}"

REGRAS:
- Seja específico (não genérico)
- Progressão natural da análise
- Português (BR)
- Máximo 15 palavras por sugestão

SUGESTÕES:
1.
2.
```

**UI:** Botões clicáveis no final da resposta

---

## Verificação

- [ ] Dados monetários exibem como "R$ X,XX"
- [ ] Status mostra emoji + label
- [ ] Datas no formato DD/MM/YYYY HH:MM
- [ ] IDs não aparecem na visualização
- [ ] 2 sugestões de follow-up aparecem
- [ ] Sugestões são clicáveis e enviam mensagem

---

## Estimativa
**Tempo:** 1-2 dias
**Custo adicional:** ~$0.005/query (follow-ups)
