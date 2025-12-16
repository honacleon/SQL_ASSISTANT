# 📋 Fase 2: Experiência Conversacional - Prompts para Tempo

## 🎯 Contexto Geral (Cole isso se for a primeira interação)

```
Continuando o desenvolvimento do SQL Assistant. O tema premium dark com dourado já está implementado na Fase 1.

Agora o foco é melhorar a experiência conversacional:
1. Respostas mais proativas e completas (não apenas responder, mas sugerir insights)
2. Sistema de abas para múltiplas conversas simultâneas

Arquivos importantes para esta fase:
- backend/src/services/multiagent-improved.ts (sistema de agentes IA)
- src/components/chat/ChatInterface.tsx
- src/pages/DashboardPage.tsx
```

---

## 🤖 PARTE 1: Respostas Proativas e Completas

### Prompt 1.1 - Criar serviço de enriquecimento de resposta

```
Crie um arquivo backend/src/services/response-enricher.ts que enriquece respostas do chat.

O serviço deve ter métodos:

1. enrichResponse(originalQuestion: string, queryResult: any, analysisContext: any): EnrichedResponse
   - Detecta tipo de resposta (contagem, listagem, agregação, etc)
   - Adiciona contexto (comparação temporal, breakdown por dimensão)
   - Gera sugestões de próximas perguntas relacionadas

2. detectResponseType(data: any[], columns: string[]): ResponseType
   - Retorna: 'single_value', 'list', 'aggregation', 'time_series', 'comparison'

3. generateFollowUpSuggestions(question: string, result: any): string[]
   - Retorna 2-3 sugestões de perguntas relacionadas

Interface EnrichedResponse:
- answer: string (resposta principal formatada)
- breakdown?: BreakdownItem[] (detalhamento se aplicável)
- comparison?: ComparisonData (vs período anterior se possível)
- suggestions: string[] (próximas perguntas sugeridas)

TESTE: Importe o serviço e chame com dados mock. Deve retornar objeto com suggestions preenchidas.
```

### Prompt 1.2 - Integrar enriquecimento no Analyst Agent

```
Modifique o método analystAgent em backend/src/services/multiagent-improved.ts:

Mudanças:
1. Após obter resultado da query, chame o response-enricher
2. O prompt do analyst deve incluir instruções para NUNCA responder apenas números
3. Adicione regras explícitas no prompt:
   - "Se for contagem, quebre por dimensões relevantes"
   - "Se for listagem, destaque os top 3 e padrões"
   - "SEMPRE termine com 1-2 sugestões de análises relacionadas"
   - "Use emojis moderadamente para engajamento (📊, 💡, 📈)"

O fluxo deve ser:
query result → enricher → analyst prompt com contexto enriquecido → resposta final

TESTE: Pergunte "Quantos registros tem na tabela X?". A resposta deve incluir contexto adicional e sugestão de próxima pergunta.
```

### Prompt 1.3 - Atualizar prompts do Coordinator Agent

```
Modifique o método coordinatorAgent em backend/src/services/multiagent-improved.ts:

Atualize o prompt do coordenador para:
1. Identificar se a pergunta é analítica ou operacional
2. Se analítica, marcar para enriquecer com insights
3. Detectar se precisa de comparação temporal
4. Identificar dimensões relevantes para breakdown

Adicione ao JSON de retorno do coordenador:
- needsEnrichment: boolean
- suggestedDimensions: string[] (ex: ['produto', 'região'])
- temporalContext: 'current' | 'comparison' | 'trend'

TESTE: Chame o coordenador com "Quantas vendas tivemos esse mês?". Deve retornar needsEnrichment: true e suggestedDimensions com pelo menos um item.
```

### Prompt 1.4 - Atualizar Formatter Agent para respostas ricas

```
Modifique o método formatterAgent em backend/src/services/multiagent-improved.ts:

Atualize para formatar respostas ricas:

1. Se houver breakdown, formate como lista com proporções:
   "📊 **Total: 100 vendas** distribuídas assim:
   - Produto A: 50 (50%)
   - Produto B: 30 (30%)
   - Produto C: 20 (20%)"

2. Se houver comparação, inclua:
   "📈 **Crescimento de 15%** vs mês anterior (87 vendas)"

3. Sempre inclua seção de sugestões:
   "💡 **Quer explorar mais?**
   - Quais produtos tiveram maior crescimento?
   - Como foi a performance por região?"

4. Use markdown adequado para o chat (negrito, listas)

TESTE: Forneça dados com breakdown mock. A resposta deve estar bem formatada com emojis e seções claras.
```

### Prompt 1.5 - Adicionar sugestões clicáveis no frontend

```
Modifique o ChatInterface.tsx para renderizar sugestões clicáveis:

1. Detecte se a mensagem do assistente contém sugestões (padrão "💡 **Quer explorar mais?**")
2. Parse as sugestões e renderize como botões clicáveis
3. Ao clicar, preencha o input com a sugestão
4. Style os botões com tema premium (borda dourada, hover effect)

Crie um sub-componente SuggestionChips:
- Recebe array de sugestões
- Renderiza como chips/botões inline
- onClick dispara callback com texto da sugestão

TESTE: Envie uma pergunta que gere sugestões. Abaixo da resposta devem aparecer botões clicáveis. Clicar deve preencher o input.
```

### Prompt 1.6 - Melhorar detecção de perguntas conversacionais

```
Modifique o método detectDirectQuestion em multiagent-improved.ts:

Adicione mais padrões de perguntas conversacionais que podem ser respondidas sem IA:
- "oi", "olá", "bom dia" → saudação amigável
- "o que você pode fazer?", "ajuda" → explicação de capacidades
- "quais tabelas existem?" → lista de tabelas
- "me explique a tabela X" → descrição das colunas

Personalize as respostas:
- Use tom amigável e proativo
- Inclua exemplos de perguntas que o usuário pode fazer
- Termine com convite para próximo passo

TESTE: Envie "oi" ou "o que você pode fazer?". Deve responder instantaneamente (sem chamar IA) com mensagem útil.
```

### Prompt 1.7 - Adicionar indicador de "digitando"

```
Melhore o UX de loading no ChatInterface.tsx:

1. Substitua o texto "O assistente está pensando..." por animação de "digitando"
2. Crie componente TypingIndicator com 3 pontos que pulam
3. Adicione transição suave ao aparecer/desaparecer
4. Mostre após pequeno delay (300ms) para evitar flash

Estilo:
- 3 círculos pequenos com cor gold
- Animação de "bounce" sequencial
- Fundo levemente elevado

Use keyframes CSS ou framer-motion.

TESTE: Envie uma mensagem. Durante o loading, deve aparecer animação elegante de digitação em vez de texto genérico.
```

---

## 📑 PARTE 2: Sistema de Abas

### Prompt 2.1 - Criar tipo e estado para Tabs

```
Crie um arquivo src/types/tabs.ts com as interfaces para o sistema de abas:

```typescript
interface ChatTab {
  id: string;
  sessionId: string | null;
  title: string;
  tableContext?: string;
  isActive: boolean;
  isPinned: boolean;
  unreadCount: number;
  createdAt: Date;
}

interface TabState {
  tabs: ChatTab[];
  activeTabId: string | null;
}
```

Crie também um arquivo src/hooks/useTabs.ts:
- Gerencia estado das abas
- Métodos: createTab, closeTab, activateTab, renameTab, pinTab, updateUnread
- Persiste no localStorage para manter entre recargas
- Limite máximo de 10 abas abertas

TESTE: Importe useTabs e chame createTab(). Recarregue página. Tab deve persistir.
```

### Prompt 2.2 - Criar componente TabBar

```
Crie src/components/chat/TabBar.tsx - barra de abas premium:

Visual:
- Fundo levemente elevado do background
- Cada tab como botão com bordas arredondadas
- Tab ativa com underline dourada ou background diferenciado
- Botão X pequeno para fechar (visível no hover)
- Botão + para nova aba no final
- Tabs pináveis com ícone de pin

Props:
- tabs: ChatTab[]
- activeTabId: string
- onSelect: (id: string) => void
- onCreate: () => void
- onClose: (id: string) => void
- onPin: (id: string) => void

Features:
- Scroll horizontal se muitas abas
- Drag and drop para reordenar (opcional, pode deixar para depois)
- Tooltip com título completo se truncado

TESTE: Renderize TabBar com 3+ tabs mock. Deve conseguir clicar, fechar e criar novas abas.
```

### Prompt 2.3 - Estilizar TabBar com tema premium

```
Atualize o TabBar.tsx para usar visual premium:

1. Fundo com glass effect sutil
2. Tab ativa com gradiente dourado no underline
3. Tab com hover que ilumina levemente
4. Botão de fechar com hover vermelho suave
5. Botão de nova aba com hover dourado
6. Transições suaves em todos os estados
7. Badge de unread com cor de alerta

Use as cores gold do tailwind config.
Use framer-motion para transições de entrada/saída das tabs.

TESTE: As abas devem ter visual elegante com todas as transições suaves e consistentes com o tema geral.
```

### Prompt 2.4 - Integrar TabBar no DashboardPage

```
Modifique DashboardPage.tsx para adicionar o sistema de abas:

1. Importe e use o hook useTabs
2. Adicione TabBar acima da área de chat
3. Cada tab mantém seu próprio estado de chat (sessionId, mensagens)
4. Ao trocar de tab, trocar o sessionId do useChat
5. Ao criar nova tab, criar nova sessão opcionalmente
6. Ao fechar tab, perguntar se quer deletar sessão ou apenas fechar

Layout:
```
┌──────────────────────────────────────────────┐
│ [+ Nova] [Tab 1] [Tab 2 ×] [Tab 3]          │
├──────────────────────────────────────────────┤
│ Sidebar │        Chat Area                   │
└──────────────────────────────────────────────┘
```

TESTE: Abra 3 abas diferentes. Converse em cada uma. Troque entre elas - o chat de cada uma deve ser independente.
```

### Prompt 2.5 - Sincronizar tabs com sessões do banco

```
Atualize a integração tabs + sessões:

1. Ao criar nova tab, automaticamente criar sessão no backend
2. Ao fechar tab permanentemente, deletar sessão no backend
3. Ao recarregar página, restaurar tabs das sessões ativas
4. Título da tab deve refletir título da sessão

No useTabs:
- Adicione loadFromSessions(sessions: Session[]): void
- Integre com useSessionHistory

Fluxo ao carregar:
1. Buscar sessões do backend
2. Criar tabs para sessões não arquivadas
3. Ativar última tab usada

TESTE: Crie sessões via chat. Recarregue página. As abas correspondentes devem aparecer automaticamente.
```

### Prompt 2.6 - Adicionar atalhos de teclado para tabs

```
Adicione atalhos de teclado para navegação de tabs:

- Ctrl+T: Nova aba
- Ctrl+W: Fechar aba atual
- Ctrl+Tab: Próxima aba
- Ctrl+Shift+Tab: Aba anterior
- Ctrl+1-9: Ir para aba específica
- Ctrl+Enter: Enviar mensagem (já existe, manter)

Modifique o hook useShortcuts.ts existente ou crie novo para tabs.
Mostre os atalhos em tooltip ao passar mouse sobre as abas.

TESTE: Use Ctrl+T para criar aba, Ctrl+W para fechar, Ctrl+Tab para navegar. Todos devem funcionar.
```

### Prompt 2.7 - Menu de contexto nas tabs

```
Adicione menu de contexto (right-click) nas tabs:

Opções do menu:
- Renomear
- Fixar/Desafixar
- Duplicar
- Fechar
- Fechar outras
- Fechar tabs à direita

Use o ContextMenu do shadcn/ui (já instalado via @radix-ui/react-context-menu).

Implemente cada ação:
- Renomear: abre input inline
- Duplicar: cria nova aba com mesma conversa
- Fechar outras: fecha todas menos a clicada

TESTE: Clique com botão direito em uma aba. Menu deve aparecer. Cada opção deve funcionar corretamente.
```

### Prompt 2.8 - Tab com contexto de tabela

```
Melhore a integração tabs + tabelas:

1. Ao selecionar tabela na sidebar, atualizar tab ativa com contexto
2. Mostrar ícone/badge da tabela na aba
3. Ao criar nova aba, perguntar qual tabela usar (ou nenhuma)
4. Permitir mudar tabela de uma aba via dropdown

Visual:
- Aba com tabela mostra pequeno badge "produtos" ou ícone de tabela
- Tooltip mostra nome completo da tabela

TESTE: Selecione tabela A na aba 1, tabela B na aba 2. O ícone/badge de cada aba deve refletir corretamente.
```

### Prompt 2.9 - Indicador de aba com atividade

```
Adicione indicadores visuais de estado nas tabs:

1. Tab com nova mensagem não lida: dot de notificação
2. Tab com erro: borda vermelha sutil
3. Tab carregando: mini-spinner no lugar do ícone
4. Tab inativa há muito tempo: estilo mais apagado

Lógica de "não lida":
- Se mensagem chega enquanto outra aba está ativa
- Incrementar unreadCount
- Zerar ao ativar a aba

TESTE: Abra 2 abas. Na aba 1, envie mensagem que demora. Vá para aba 2. Quando resposta chegar, aba 1 deve mostrar dot.
```

### Prompt 2.10 - Confirmação ao fechar tabs com conteúdo

```
Adicione confirmação inteligente ao fechar tabs:

1. Se tab tem mensagens não salvas: confirmar
2. Se tab está carregando: confirmar 
3. Se tab está vazia: fechar direto
4. Se fechando última tab: criar nova automaticamente

Use AlertDialog do shadcn para confirmação.
Mensagem: "Esta conversa tem X mensagens. Fechar mesmo assim?"
Opções: "Cancelar" e "Fechar" (vermelho)

TESTE: Crie aba, envie mensagens, tente fechar. Deve aparecer confirmação. Aba vazia deve fechar sem confirmação.
```

---

## ✅ Checklist de Verificação da Fase 2

Antes de passar para a Fase 3, verifique:

- [ ] Respostas do chat incluem contexto extra (não apenas números)
- [ ] Sugestões de próximas perguntas aparecem nas respostas
- [ ] Chips de sugestão são clicáveis e preenchem o input
- [ ] Perguntas conversacionais respondem instantaneamente
- [ ] Indicador de "digitando" animado funciona
- [ ] Sistema de abas funciona (criar, fechar, navegar)
- [ ] Cada aba mantém seu próprio chat independente
- [ ] Tabs sincronizam com sessões do backend
- [ ] Atalhos de teclado funcionam
- [ ] Menu de contexto nas tabs funciona
- [ ] Indicadores visuais de estado nas tabs
- [ ] Nenhum erro no console
- [ ] Build de produção funciona
