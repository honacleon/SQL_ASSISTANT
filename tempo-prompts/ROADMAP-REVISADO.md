# 📋 Roadmap Revisado - SQL Assistant

> **Nota:** Este documento substitui o plano original das FASE-*.md para fins de desenvolvimento.  
> Os arquivos FASE-*.md originais foram criados para o Tempo.new e servem como referência.

## Decisões Confirmadas
- **Auth:** Supabase Auth completo
- **Multi-tenant:** Organizações com múltiplos membros
- **CSV:** Máximo 50MB (dividir arquivos maiores)
- **Admin:** Métricas agregadas (mais simples)

---

## Status Atual

| Fase | Nome | Status |
|------|------|--------|
| 1 | Fundação Premium | ✅ Concluída |
| 2 | Experiência Conversacional | ✅ Concluída |
| 3 | Visualização de Dados | 🎯 Próxima |
| 3.5 | IA Conversacional | ⏳ Aguardando |
| 4 | Autenticação + RLS | ⏳ Aguardando |
| 5 | CSV Upload + Isolamento | ⏳ Aguardando |
| 6 | Knowledge Base + Cache | ⏳ Aguardando |
| 7 | Queries Salvas | ⏳ Aguardando |
| 8 | Dashboards | ⏳ Aguardando |
| 9 | Admin + Planos | ⏳ Aguardando |

---

## Fases Detalhadas

### ✅ Fase 1-2: Concluídas
Visual premium + experiência conversacional com abas.

---

### 🎯 Fase 3: Visualização de Dados
**Objetivo:** Gráficos interativos e exportação

| Item | Descrição |
|------|-----------|
| Recharts | Bar, Line, Pie charts |
| Chart suggester | Sugestão automática de tipo |
| Exportação | CSV, Excel, JSON, PNG, PDF |
| DataViz | Toggle gráfico/tabela |

---

### 🎯 Fase 3.5: IA Conversacional (NOVA)
**Objetivo:** Resolver dores do chat "engessado"

| Item | Descrição |
|------|-----------|
| JOINs | Melhorar cruzamento de tabelas |
| Contexto | Memória mais robusta |
| Naturalidade | Respostas menos "robóticas" |
| Sugestões | Baseadas em histórico |

---

### 🎯 Fase 4: Autenticação + RLS
**Objetivo:** Base de segurança

| Item | Descrição |
|------|-----------|
| Supabase Auth | Login, signup, recuperação |
| Google OAuth | Login social |
| RLS | Row Level Security por org |
| Middleware | Token validation no backend |

---

### 🎯 Fase 5: CSV Upload + Isolamento
**Objetivo:** Importação segura de dados

| Item | Descrição |
|------|-----------|
| Upload | Drag & drop, max 50MB |
| Validação | Formato, encoding, delimitador |
| Isolamento | Dados separados por org_id |
| Temporário | Opção de expiração |

---

### 🎯 Fase 6: Knowledge Base + Cache
**Objetivo:** Otimização e contexto

| Item | Descrição |
|------|-----------|
| Descrições | Metadados de tabelas/colunas |
| Sugestão IA | Auto-gerar descrições |
| Cache | Schema e queries frequentes |
| Economia | Modelo híbrido fast/full |

---

### 🎯 Fase 7: Queries Salvas
**Objetivo:** Produtividade

| Item | Descrição |
|------|-----------|
| Salvar | Queries do chat |
| Templates | Com parâmetros variáveis |
| Busca | Ctrl+K quick search |
| Sugestões | Contextuais por tabela |

---

### 🎯 Fase 8: Dashboards
**Objetivo:** Visualização avançada

| Item | Descrição |
|------|-----------|
| Grid | Drag & drop layout |
| Widgets | Chart, metric, table, text |
| Auto-refresh | Atualização periódica |
| Compartilhar | Dashboards da org |

---

### 🎯 Fase 9: Admin + Planos
**Objetivo:** Monetização

| Item | Descrição |
|------|-----------|
| Admin | Métricas de uso agregadas |
| Planos | Free, Pro, Enterprise |
| Limites | Queries/dia, storage |
| Organizações | CRUD de membros |

---

## Cronograma Estimado

| Fase | Semanas | Prioridade |
|------|---------|------------|
| 3 | 2-3 | Alta |
| 3.5 | 1-2 | Alta |
| 4 | 2 | Crítica |
| 5 | 2 | Crítica |
| 6 | 2 | Média |
| 7 | 2 | Média |
| 8 | 3-4 | Baixa |
| 9 | 3-4 | Baixa |

**Total estimado: ~17-21 semanas**

---

## Diferenças do Plano Original

| Aspecto | Original | Revisado |
|---------|----------|----------|
| Autenticação | Fase 7 | Fase 4 (antecipada) |
| CSV Upload | Fase 6 | Fase 5 (com isolamento) |
| Dashboards | Fase 5 | Fase 8 (adiada) |
| IA Conversacional | Não existia | Fase 3.5 (nova) |
| Total de fases | 8 | 9 |
