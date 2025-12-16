# 📋 Fase 1: Fundação Premium - Prompts para Tempo

## 🎯 Contexto Geral (Cole isso primeiro para dar contexto ao Tempo)

```
Estou trabalhando em um SQL Assistant que permite conversar com bancos de dados usando linguagem natural. O projeto usa:
- React + TypeScript + Vite
- TailwindCSS + ShadCN UI (componentes em src/components/ui/)
- Framer Motion (já instalado)
- Backend Express com Supabase

O objetivo desta fase é transformar o visual atual em um tema premium "dark luxuoso" com cores preto profundo e acentos dourados/champanhe, além de implementar persistência de histórico de chat.

Arquivos importantes:
- src/index.css (variáveis CSS do tema)
- tailwind.config.js (configuração Tailwind)
- src/pages/DashboardPage.tsx (página principal)
- src/components/chat/ChatInterface.tsx (interface de chat)
```

---

## 🎨 PARTE 1: Tema Visual Premium (Preto + Dourado)

### Prompt 1.1 - Atualizar variáveis de cor base

```
Atualize o arquivo src/index.css para usar um tema dark luxuoso com cores preto profundo e acentos dourados/champanhe.

Substitua as variáveis CSS no .dark {} por:
- --background: fundo preto profundo (#0d0f12)
- --foreground: texto claro com tom quente
- --primary: dourado vibrante (#d4a418)
- --primary-foreground: texto escuro para contraste
- --secondary: cinza escuro elevado
- --accent: dourado suave (#d9b84d)
- --muted: cinza médio escuro
- --border: bordas sutis escuras
- --card: fundo de cards ligeiramente mais claro que background

Mantenha a estrutura existente das variáveis, apenas mude os valores HSL.

TESTE: Após a mudança, navegue para /dashboard no app. O fundo deve ser preto profundo e os elementos de destaque devem ter tons dourados.
```

### Prompt 1.2 - Adicionar cores gold/champagne no Tailwind

```
Adicione novas cores customizadas ao tailwind.config.js para usar além das variáveis padrão:

No objeto extend.colors, adicione:
- gold: {
    50: '#fdf9e7',
    100: '#faf0c5',
    200: '#f5e08a',
    300: '#ecc94b',
    400: '#d4a418',
    500: '#b88a14',
    600: '#8f6b10',
    700: '#664d0c',
    800: '#3d2e07',
    900: '#1f1703'
  }
- champagne: '#d4c9a3'

TESTE: Crie um elemento temporário com classe "bg-gold-400 text-white p-4" em qualquer componente. Deve aparecer com fundo dourado.
```

### Prompt 1.3 - Adicionar keyframes de animação premium

```
Adicione novos keyframes de animação ao tailwind.config.js para efeitos premium:

No extend.keyframes, adicione:
- "shimmer": efeito de brilho que se move horizontalmente (para loading states)
- "glow-pulse": pulsação suave de sombra dourada
- "fade-in-up": fade in com movimento de baixo para cima
- "slide-in-right": entrada suave da direita

No extend.animation, adicione as animações correspondentes com durações apropriadas.

TESTE: Adicione temporariamente "animate-shimmer" ou "animate-glow-pulse" a um elemento. Deve animar suavemente.
```

### Prompt 1.4 - Criar componente GlassCard

```
Crie um novo componente em src/components/ui/glass-card.tsx que implementa o efeito glassmorphism.

O componente deve:
- Ter fundo semi-transparente com blur (backdrop-filter)
- Borda sutil com tom dourado (rgba do gold)
- Suportar props: className, children
- Usar forwardRef para compatibilidade
- Variantes: default, elevated, bordered

Use a função cn() existente para merge de classes. Exporte o componente.

TESTE: Importe e use <GlassCard> em DashboardPage.tsx temporariamente. Deve aparecer com efeito de vidro fosco e borda dourada sutil.
```

### Prompt 1.5 - Atualizar Sidebar com tema premium

```
Atualize o componente SidebarTables em src/pages/DashboardPage.tsx para usar o novo tema premium:

Mudanças:
1. Altere o Card da sidebar para usar fundo mais escuro (bg-background ou nova classe)
2. Adicione borda direita sutil com tom dourado
3. Os botões de tabela devem ter hover com efeito dourado
4. O ícone de Database deve usar cor gold-400
5. Adicione transições suaves nos hovers (transition-all duration-200)

Mantenha toda a funcionalidade existente, apenas melhore o visual.

TESTE: Navegue para /dashboard. A sidebar deve ter fundo escuro, ícones dourados, e hovers com efeito premium.
```

### Prompt 1.6 - Atualizar ChatInterface com tema premium

```
Atualize o componente ChatInterface em src/components/chat/ChatInterface.tsx para visual premium:

Mudanças:
1. O ícone Bot deve usar cor gold-400
2. As mensagens do assistente devem ter fundo com tom mais elevado
3. As mensagens do usuário devem usar gradiente com tons dourados (from-gold-500 to-gold-600)
4. Adicione animação fade-in-up nas novas mensagens usando framer-motion
5. O botão de enviar deve ter efeito de glow no hover
6. O textarea deve ter borda que fica dourada no focus

TESTE: Envie uma mensagem no chat. As bolhas devem aparecer com animação suave, cores premium, e contrastes adequados.
```

### Prompt 1.7 - Adicionar animações com Framer Motion

```
Crie um arquivo src/styles/animations.ts com variantes de animação reutilizáveis do Framer Motion:

Exporte as seguintes variantes:
- fadeInUp: opacity 0→1, y 20→0
- fadeIn: apenas opacity
- slideInRight: x 30→0
- staggerContainer: para animar filhos sequencialmente
- scaleOnHover: escala 1.02 no hover
- pulseGlow: animação de sombra pulsante

Cada variante deve ter objetos para initial, animate, e exit conforme necessário.

TESTE: Importe uma variante em qualquer componente e aplique com <motion.div variants={fadeInUp}>. Deve animar ao aparecer.
```

### Prompt 1.8 - Aplicar animações na lista de tabelas

```
Atualize a lista de tabelas na SidebarTables em DashboardPage.tsx para usar animações:

1. Envolva a lista com motion.div usando staggerContainer
2. Cada item de tabela deve usar fadeInUp individualmente
3. Adicione scaleOnHover nos botões de tabela
4. O loading skeleton deve ter animação shimmer

Importe as variantes do arquivo src/styles/animations.ts criado anteriormente.

TESTE: Recarregue a página /dashboard. As tabelas devem aparecer uma após a outra com animação suave. Hover nos botões deve ter efeito de escala.
```

### Prompt 1.9 - Criar DataPanel com visual premium

```
Atualize o componente DataPanel em DashboardPage.tsx para visual premium:

1. Use GlassCard como container principal
2. Header com gradiente sutil dourado
3. Badge de contagem de registros com estilo premium
4. Botão de atualizar com ícone que gira usando animação CSS
5. Estado vazio com ícone dourado e estilo elegante
6. Adicione shadow com tom dourado nos focos

TESTE: Clique em Preview de uma tabela. O drawer deve ter visual premium com efeitos de vidro e acentos dourados.
```

### Prompt 1.10 - Página inicial (Home) com visual premium

```
Atualize o componente src/components/home.tsx para usar o tema premium:

1. Fundo com gradiente diagonal sutil (preto para cinza escuro)
2. Título principal com gradiente de texto dourado
3. Cards de features com efeito glassmorphism
4. Botões CTA com gradiente dourado e efeito glow no hover
5. Animações de entrada ao carregar a página

Mantenha o conteúdo existente, apenas melhore o visual.

TESTE: Navegue para / (home). A página deve ter visual luxuoso com gradientes, texto dourado e animações suaves.
```

---

## 💾 PARTE 2: Persistência de Histórico de Chat

### Prompt 2.1 - Criar migration SQL para histórico

```
Crie um arquivo backend/src/migrations/001_chat_history.sql com o schema para histórico de chat:

Tabelas necessárias:
1. chat_sessions:
   - id (UUID primary key)
   - title (TEXT, default 'Nova conversa')
   - table_context (TEXT, nullable - tabela em uso)
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)
   - is_archived (BOOLEAN, default false)

2. chat_messages:
   - id (UUID primary key)
   - session_id (UUID, foreign key para chat_sessions com ON DELETE CASCADE)
   - role (TEXT, check 'user', 'assistant', 'system')
   - content (TEXT)
   - metadata (JSONB, default '{}')
   - created_at (TIMESTAMPTZ)

Adicione índices para session_id e created_at.

TESTE: Este é apenas o schema SQL. Copie e execute no Supabase SQL Editor para criar as tabelas.
```

### Prompt 2.2 - Criar serviço de histórico no backend

```
Crie um arquivo backend/src/services/history.service.ts para gerenciar persistência do histórico:

O serviço deve ter métodos:
1. createSession(title?: string, tableContext?: string): Promise<Session>
2. getSession(sessionId: string): Promise<Session | null>
3. listSessions(limit?: number): Promise<Session[]>
4. deleteSession(sessionId: string): Promise<void>
5. addMessage(sessionId: string, role: string, content: string, metadata?: object): Promise<Message>
6. getMessages(sessionId: string): Promise<Message[]>
7. updateSessionTitle(sessionId: string, title: string): Promise<void>

Use o cliente Supabase existente em backend/src/config/supabase.ts.
Trate erros adequadamente com try/catch e logging.

TESTE: Importe o serviço em backend/src/index.ts e chame listSessions() no startup. Deve logar array vazio sem erros.
```

### Prompt 2.3 - Adicionar rotas de histórico

```
Atualize o arquivo backend/src/routes/chat.routes.ts para adicionar rotas de persistência:

Novas rotas:
1. GET /api/chat/sessions - listar sessões (usa history.service.listSessions)
2. POST /api/chat/sessions - criar nova sessão
3. GET /api/chat/sessions/:id - obter sessão específica
4. DELETE /api/chat/sessions/:id - deletar sessão
5. GET /api/chat/sessions/:id/messages - listar mensagens da sessão
6. PATCH /api/chat/sessions/:id - atualizar título da sessão

Cada rota deve retornar { success: true, data: ... } ou { success: false, error: ... }
Use o history.service criado anteriormente.

TESTE: Use Postman ou curl para chamar GET http://localhost:3000/api/chat/sessions. Deve retornar { success: true, data: [] }.
```

### Prompt 2.4 - Atualizar endpoint de mensagem para persistir

```
Modifique o handler POST /api/chat/message em chat.routes.ts para:

1. Aceitar sessionId opcional no body
2. Se sessionId fornecido, buscar mensagens anteriores para contexto
3. Após processar a mensagem, salvar tanto a pergunta do usuário quanto a resposta no banco
4. Retornar o sessionId na resposta (criar novo se não fornecido)

O fluxo deve ser:
- Recebe mensagem + sessionId (opcional)
- Se novo, cria sessão
- Processa com IA
- Salva pergunta e resposta no banco
- Retorna resposta + sessionId

TESTE: Envie POST com { "message": "teste", "context": { "currentTable": "..." } }. Depois GET /sessions deve mostrar nova sessão.
```

### Prompt 2.5 - Criar hook useSessionHistory

```
Crie um novo hook src/hooks/useSessionHistory.ts para gerenciar sessões no frontend:

O hook deve:
1. Manter lista de sessões (useState)
2. fetchSessions(): carrega lista do backend
3. createSession(): cria nova sessão
4. deleteSession(id): deleta sessão
5. switchSession(id): muda sessão ativa e carrega mensagens
6. Estado: sessions, activeSessionId, loading, error

Use o hook useApi existente ou fetch direto.
O hook deve carregar sessões ao montar.

TESTE: Importe o hook em DashboardPage e console.log(sessions). Deve mostrar array de sessões (vazio inicialmente).
```

### Prompt 2.6 - Atualizar useChat para usar sessões

```
Modifique o hook src/hooks/useChat.ts para:

1. Aceitar sessionId como parâmetro
2. Ao enviar mensagem, incluir sessionId no request
3. Receber sessionId da resposta e atualizar estado
4. Carregar mensagens existentes quando sessionId mudar
5. Expor sessionId no retorno do hook

Mantenha compatibilidade: se sessionId não fornecido, funciona como antes (sem persistência).

TESTE: No DashboardPage, passe um sessionId fixo para useChat. Envie mensagens. Recarregue a página com mesmo sessionId. Mensagens anteriores devem aparecer.
```

### Prompt 2.7 - Criar componente SessionList

```
Crie um componente src/components/chat/SessionList.tsx que mostra histórico de sessões:

Interface:
- Lista de sessões com título e data
- Sessão ativa destacada visualmente
- Botão para criar nova sessão
- Botão de deletar em cada sessão (com confirmação)
- Ícone indicando tabela em contexto
- Loading state e empty state

Props:
- sessions: Session[]
- activeSessionId: string | null
- onSelectSession: (id: string) => void
- onCreateSession: () => void
- onDeleteSession: (id: string) => void
- loading: boolean

Use o tema premium (cores gold, animações, etc).

TESTE: Renderize o componente com dados mock. Deve mostrar lista elegante com interações funcionais.
```

### Prompt 2.8 - Integrar SessionList na Sidebar

```
Atualize o DashboardPage.tsx para integrar o histórico de sessões:

1. Adicione uma seção "Conversas" na sidebar, abaixo da lista de tabelas
2. Use o Separator do shadcn para dividir as seções
3. Integre o SessionList com o useSessionHistory
4. Ao clicar em uma sessão, carregar suas mensagens no chat
5. Ao criar nova sessão, limpar chat e iniciar nova conversa
6. Ao selecionar uma tabela, criar nova sessão automaticamente se não houver ativa

TESTE: 
1. Navegue para /dashboard
2. Selecione uma tabela e envie mensagem
3. Crie nova sessão
4. Volte para sessão anterior - mensagens devem aparecer
5. Recarregue a página - sessões devem persistir
```

### Prompt 2.9 - Auto-nomear sessões com IA

```
Adicione funcionalidade para nomear sessões automaticamente:

1. No backend, após a primeira mensagem de uma sessão, gere um título curto com IA
2. O título deve resumir o tema da conversa em 3-5 palavras
3. Use o modelo mais barato disponível (haiku ou similar)
4. Atualize o título da sessão no banco

Exemplo: "Quantas vendas tivemos?" → "Análise de Vendas"

Prompt sugerido para IA:
"Dado esta primeira mensagem de uma conversa sobre dados: '{mensagem}'. Gere um título curto (3-5 palavras) que resume o tema. Responda apenas com o título."

TESTE: Inicie nova sessão e envie mensagem. Após alguns segundos, o título da sessão na sidebar deve atualizar para algo descritivo.
```

### Prompt 2.10 - Indicador visual de sessão não salva

```
Adicione feedback visual para o estado de salvamento:

1. Enquanto uma mensagem está sendo enviada/salva, mostre indicador sutil
2. Se houver erro ao salvar, mostre toast de erro com opção de retry
3. Sessões não salvas (novas) devem ter indicador visual diferente
4. Adicione auto-save do título editável

Use toast do react-hot-toast já instalado.
Adicione ícone de check sutil quando salvo com sucesso.

TESTE: Desconecte a internet e tente enviar mensagem. Deve aparecer erro. Reconecte e faça retry com sucesso.
```

---

## ✅ Checklist de Verificação da Fase 1

Antes de passar para a Fase 2, verifique:

- [ ] Tema dark com cores preto e dourado aplicado em toda a app
- [ ] Animações suaves funcionando (hover, entrada de elementos)
- [ ] Efeito glassmorphism nos cards principais
- [ ] Histórico de sessões persistindo no banco
- [ ] Lista de sessões na sidebar funcionando
- [ ] Troca entre sessões carrega mensagens corretas
- [ ] Criação de nova sessão limpa o chat
- [ ] Título automático das sessões funcionando
- [ ] Nenhum erro no console
- [ ] Build de produção funciona (npm run build)
