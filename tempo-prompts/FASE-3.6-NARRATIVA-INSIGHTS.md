# 🎯 FASE 3.6: Narrativa + Insights

## Objetivo
Transformar dados em história compreensível + gerar insights automáticos.

## Decisões Confirmadas
- Narrativa: **ANTES** do gráfico
- Insights: **SEMPRE** (sem toggle)

---

## Tarefas

### 3.6.1 Response Narrator

Gerar resumo em linguagem natural.

**Arquivo:** `backend/src/services/response-narrator.ts`

**Prompt LLM:**
```
Gere um resumo conversacional em português (BR) dos resultados.

PERGUNTA: "${question}"
DADOS: ${rowCount} registros
COLUNAS: ${columns.join(', ')}
ESTATÍSTICAS:
- Total: ${stats.sum}
- Média: ${stats.avg}
- Mínimo: ${stats.min}
- Máximo: ${stats.max}

INSTRUÇÕES:
1. Responda diretamente a pergunta
2. Inclua 1-2 estatísticas relevantes
3. Seja conversacional (evite jargão)
4. Máximo 3 frases
5. Use formatação brasileira (R$, dd/mm/yyyy)

RESUMO:
```

**Exemplo de Output:**
```
"Encontrei 10 pedidos no período, totalizando R$ 2.514,63. 
A maioria (80%) está completa, com ticket médio de R$ 251,46."
```

---

### 3.6.2 Insight Generator

Gerar 2-3 insights automáticos.

**Arquivo:** `backend/src/services/insight-generator.ts`

**Prompt LLM:**
```
Analise estes dados e gere 2-3 insights acionáveis.

PERGUNTA: "${question}"
DADOS: ${JSON.stringify(sampleData)}
ESTATÍSTICAS: ${JSON.stringify(stats)}

Retorne JSON array:
[
  {
    "title": "Título curto (máx 6 palavras)",
    "description": "Explicação (1-2 frases)",
    "type": "positive|warning|neutral",
    "icon": "✅|⚠️|📊|📈|📉"
  }
]

Máximo 3 insights.
```

**Exemplo de Output:**
```json
[
  {
    "title": "80% dos pedidos completos",
    "description": "Taxa de conclusão está acima da média histórica.",
    "type": "positive",
    "icon": "✅"
  },
  {
    "title": "2 pedidos pendentes",
    "description": "Pendentes há mais de 48h. Verificar gateway de pagamento.",
    "type": "warning",
    "icon": "⚠️"
  }
]
```

**UI:** Cards com ícones coloridos

---

## Estrutura da Resposta Final

```
┌─────────────────────────────────────────────────┐
│ 💬 NARRATIVA (Response Narrator)                │
│ "Encontrei 10 pedidos totalizando R$ 2.514..."  │
├─────────────────────────────────────────────────┤
│ 📊 GRÁFICO/TABELA (já existe)                   │
├─────────────────────────────────────────────────┤
│ 💡 INSIGHTS (Insight Generator)                 │
│ ✅ 80% dos pedidos completos                    │
│ ⚠️ 2 pedidos pendentes há mais de 48h          │
├─────────────────────────────────────────────────┤
│ 🔗 SUGESTÕES (Follow-up Suggester - Fase 3.5)  │
│ • Ver evolução nos últimos 6 meses             │
│ • Analisar clientes com maior ticket           │
└─────────────────────────────────────────────────┘
```

---

## Verificação

- [ ] Narrativa aparece ANTES do gráfico
- [ ] Narrativa é conversacional e natural
- [ ] 2-3 insights são gerados
- [ ] Insights têm ícones coloridos
- [ ] Insights positivos/warning/neutral funcionam
- [ ] Resposta completa integra todos os componentes

---

## Estimativa
**Tempo:** 2-3 dias
**Custo adicional:** ~$0.015/query (narrativa + insights)
