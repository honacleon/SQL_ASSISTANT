# 📋 Fase 7: Segurança Enterprise - Prompts para Tempo

## 🎯 Contexto Geral

```
Continuando o SQL Assistant. Implementações anteriores: visual premium, chat avançado, gráficos, dashboards, integrações.

Esta fase foca em segurança para uso empresarial:
1. Autenticação de usuários (login/signup)
2. Row Level Security (RLS) para isolamento
3. Audit log para compliance

Stack de autenticação: Supabase Auth (já disponível, basta usar)
```

---

## 🔐 PARTE 1: Autenticação de Usuários

### Prompt 1.1 - Configurar Supabase Auth no frontend

```
Configure o cliente Supabase com suporte a Auth:

Crie/atualize src/lib/supabase.ts:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

Adicione ao .env.local:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

TESTE: Importe supabase em qualquer componente. Chame supabase.auth.getSession(). Não deve dar erro.
```

### Prompt 1.2 - Criar hook useAuth

```
Crie src/hooks/useAuth.ts:

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

function useAuth() {
  const [state, setState] = useState<AuthState>({ ... });
  
  // Carregar sessão inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(s => ({ ...s, user: session?.user ?? null, session, loading: false }));
    });
    
    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState(s => ({ ...s, user: session?.user ?? null, session }));
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signIn = async (email: string, password: string) => { ... };
  const signUp = async (email: string, password: string) => { ... };
  const signOut = async () => { ... };
  const signInWithGoogle = async () => { ... };
  const resetPassword = async (email: string) => { ... };
  
  return { ...state, signIn, signUp, signOut, signInWithGoogle, resetPassword };
}
```

TESTE: Use o hook no App.tsx. console.log(user). Deve mostrar null (não logado ainda).
```

### Prompt 1.3 - Criar página de Login

```
Crie src/pages/LoginPage.tsx:

Layout:
- Centralizado na tela
- Card com logo e título
- Form com:
  - Input Email
  - Input Password
  - Checkbox "Lembrar-me"
  - Botão "Entrar"
  - Botão "Entrar com Google" (social login)
  - Link "Esqueci minha senha"
  - Link "Criar conta"

Validações:
- Email válido
- Senha mínimo 6 caracteres
- Mostrar erros inline

Visual: tema premium (card glass, botões dourados)

Loading state:
- Botão mostra spinner enquanto processa
- Inputs desabilitados durante loading

TESTE: Navegue para /login. Form deve aparecer bonito. Tentar login com dados inválidos deve mostrar erro.
```

### Prompt 1.4 - Criar página de Signup

```
Crie src/pages/SignupPage.tsx:

Form:
- Nome completo
- Email
- Senha
- Confirmar senha
- Checkbox "Aceito os termos"
- Botão "Criar conta"
- Link "Já tenho conta"

Validações:
- Nome não vazio
- Email válido
- Senha mínimo 8 caracteres
- Senhas coincidem
- Termos aceitos

Após signup bem-sucedido:
- Mostrar mensagem "Verifique seu email"
- Ou redirecionar para home se auto-confirm habilitado

Visual consistente com LoginPage.

TESTE: Navegue para /signup. Registre usuário novo. Email de confirmação deve chegar (se configurado).
```

### Prompt 1.5 - Criar componente ProtectedRoute

```
Crie src/components/auth/ProtectedRoute.tsx:

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string; // default: /login
}

function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingScreen />; // spinner fullscreen
  }
  
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}
```

Use em App.tsx para proteger rotas:
```tsx
<Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
```

TESTE: Deslogado, tente acessar /dashboard. Deve redirecionar para /login.
```

### Prompt 1.6 - Atualizar App.tsx com rotas de auth

```
Atualize src/App.tsx:

Rotas públicas:
- / - Home (ou redirect para /dashboard se logado)
- /login - LoginPage
- /signup - SignupPage
- /forgot-password - ForgotPasswordPage

Rotas protegidas (envolva com ProtectedRoute):
- /dashboard - Chat principal
- /dashboards - Lista de dashboards
- /dashboards/:id - Ver dashboard
- /queries - Queries salvas
- /knowledge - Knowledge Base
- /connections - Conexões
- /settings - Configurações

Redirecionar:
- Se logado e acessar /login → /dashboard
- Se deslogado e acessar rota protegida → /login

TESTE: Fluxo completo: ir para /, clicar em "Entrar", logar, ser redirecionado para dashboard.
```

### Prompt 1.7 - Adicionar header com info do usuário

```
Crie src/components/layout/AppHeader.tsx:

Conteúdo:
- Logo à esquerda (clicável, vai para home/dashboard)
- Navegação central (links para seções principais)
- Avatar do usuário à direita
  - Dropdown com: Nome, Email, "Configurações", "Sair"

Avatar:
- Mostrar foto do Google se disponível
- Ou iniciais do nome em círculo dourado

Dropdown:
- Separador antes de "Sair"
- Confirmar antes de logout? (opcional)

Visual: glass effect, borda inferior sutil.

TESTE: Logue-se. Header deve mostrar seu nome/avatar. Dropdown deve ter opções funcionais.
```

### Prompt 1.8 - Página de recuperação de senha

```
Crie src/pages/ForgotPasswordPage.tsx:

Form:
- Email
- Botão "Enviar link de recuperação"
- Link "Voltar ao login"

Fluxo:
1. Usuário digita email
2. Chama supabase.auth.resetPasswordForEmail(email)
3. Mostra mensagem "Se este email existir, você receberá um link"
4. Link no email redireciona para /reset-password com token
5. Página /reset-password permite definir nova senha

Crie também ResetPasswordPage.tsx para o passo 5.

TESTE: Peça recuperação de senha. Email deve chegar. Link deve funcionar.
```

### Prompt 1.9 - Social login com Google

```
Configure Google OAuth:

1. No Supabase Dashboard:
   - Authentication > Providers > Google
   - Configurar Client ID e Secret
   - Adicionar redirect URL

2. No frontend, no useAuth:
```typescript
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  if (error) throw error;
};
```

3. Atualizar LoginPage:
   - Botão "Entrar com Google" com ícone
   - Separador "ou"
   - Chamr signInWithGoogle ao clicar

TESTE: Clique "Entrar com Google". Popup do Google. Autorize. Deve redirecionar logado.
```

### Prompt 1.10 - Página de configurações do usuário

```
Crie src/pages/SettingsPage.tsx:

Seções:
1. Perfil:
   - Nome (editável)
   - Email (readonly)
   - Foto (upload ou de Google)

2. Segurança:
   - Alterar senha
   - Habilitar 2FA (preparar UI, implementar depois)
   - Sessões ativas

3. Preferências:
   - Tema (claro/escuro) - já implementado
   - Idioma (preparar para i18n)
   - Notificações

4. Conta:
   - Exportar meus dados
   - Deletar conta (com confirmação séria)

Cada seção em card separado com título.

TESTE: Navegue para /settings. Edite nome. Salve. Recarregue - deve persistir.
```

---

## 🛡️ PARTE 2: Row Level Security

### Prompt 2.1 - Adicionar user_id às tabelas

```
Crie migration para adicionar user_id nas tabelas existentes:

```sql
-- Adicionar user_id em tabelas de usuário
ALTER TABLE chat_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE dashboards ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE saved_queries ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE table_metadata ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Criar índices
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_dashboards_user ON dashboards(user_id);
CREATE INDEX idx_saved_queries_user ON saved_queries(user_id);
```

Dados existentes: definir user_id = null ou primeiro usuário criado.

TESTE: Verifique que colunas foram adicionadas corretamente no Supabase.
```

### Prompt 2.2 - Habilitar RLS nas tabelas

```
Habilite Row Level Security:

```sql
-- Habilitar RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_queries ENABLE ROW LEVEL SECURITY;

-- Policies para chat_sessions
CREATE POLICY "Users can view own sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Policies similares para outras tabelas...
```

IMPORTANTE: O service_role_key bypassa RLS (usado pelo backend).

TESTE: Logue como usuário A, crie sessão. Logue como B, não deve ver sessão de A.
```

### Prompt 2.3 - Atualizar backend para usar user_id

```
Modifique os services do backend para incluir user_id:

Opção 1 - Receber user do token:
- Frontend envia access_token nas requisições
- Backend valida token e extrai user_id
- Usa user_id nas queries

```typescript
// middleware/auth.middleware.ts
async function extractUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    req.user = user;
  }
  next();
}

// Em qualquer service
async createSession(userId: string, ...) {
  return await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, ... });
}
```

TESTE: Crie sessão via API autenticada. Verifique que user_id foi preenchido.
```

### Prompt 2.4 - Enviar token do frontend

```
Atualize as chamadas de API do frontend para incluir token:

No useApi.ts ou similar:
```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
}
```

Atualize todos os hooks (useChat, useTables, etc) para usar fetchWithAuth.

TESTE: Com network tab aberto, faça request. Deve ter header Authorization com token.
```

### Prompt 2.5 - Verificação de token no middleware

```
Atualize backend/src/middleware/auth.ts:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth error' });
  }
}
```

Aplique às rotas que precisam de autenticação.

TESTE: Chame endpoint protegido sem token. Deve retornar 401.
```

---

## 📝 PARTE 3: Audit Log

### Prompt 3.1 - Criar tabela de audit log

```
Crie migration para audit log:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'query_execute', 'session_create', 'export', etc
  resource_type TEXT NOT NULL, -- 'query', 'session', 'dashboard', 'export'
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- RLS: usuários podem ver apenas próprios logs (admin vê tudo)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON audit_log FOR SELECT
  USING (auth.uid() = user_id);
```

TESTE: Insira log de teste. Consulte - deve retornar.
```

### Prompt 3.2 - Criar serviço de audit

```
Crie backend/src/services/audit.service.ts:

```typescript
interface AuditEntry {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  async log(entry: AuditEntry): Promise<void> {
    await supabase
      .from('audit_log')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        details: entry.details,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      });
  }
  
  async getUserLogs(userId: string, options?: { limit?: number; offset?: number }): Promise<AuditEntry[]>
  
  async getLogsByAction(action: string, options?: DateRange): Promise<AuditEntry[]>
}

export const auditService = new AuditService();
```

TESTE: Chame auditService.log(). Verifique no banco que registro foi criado.
```

### Prompt 3.3 - Logar execução de queries

```
Adicione audit log ao fluxo de queries:

No chat.routes.ts ou multiagent-improved.ts:

```typescript
// Após executar query com sucesso
await auditService.log({
  userId: req.user.id,
  action: 'query_execute',
  resourceType: 'query',
  details: {
    question: request.text,
    sqlGenerated: result.sql,
    rowCount: result.data?.length,
    executionTimeMs: endTime - startTime,
  },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

Logar também queries que falharam (com action: 'query_error').

TESTE: Execute query via chat. Verifique audit_log. Deve ter registro da query.
```

### Prompt 3.4 - Logar outras ações importantes

```
Adicione audit log para ações sensíveis:

Ações a logar:
- user_login - quando usuário loga
- user_logout - quando usuário desloga
- session_create - nova sessão de chat
- session_delete - deletar sessão
- dashboard_create - criar dashboard
- dashboard_delete - deletar dashboard
- export_data - exportar dados (CSV, Excel, etc)
- settings_change - alterar configurações
- password_change - alterar senha

Adicione chamadas auditService.log() nos handlers apropriados.

TESTE: Faça várias ações. Verifique audit_log. Todas devem estar registradas.
```

### Prompt 3.5 - Página de Audit Log para usuário

```
Crie src/pages/ActivityPage.tsx (ou seção em Settings):

Mostra histórico de atividades do usuário:
- Timeline vertical
- Cada item mostra: ação, recurso, data/hora
- Filtros: por tipo de ação, por período
- Paginação

Visual:
- Ícone para cada tipo de ação
- Data formatada relativamente ("há 5 minutos")
- Tooltip com detalhes adicionais

TESTE: Navegue para /activity. Deve mostrar suas ações recentes em timeline bonita.
```

### Prompt 3.6 - Endpoint para admin ver logs (preparação)

```
Prepare endpoint de admin para ver todos os logs:

GET /api/admin/audit
- Requer role: admin
- Query params: userId, action, resourceType, startDate, endDate
- Paginação

Middleware de admin:
```typescript
function requireAdmin(req, res, next) {
  if (!req.user?.app_metadata?.role === 'admin') {
    return res.status(403).json({ error: 'Admin required' });
  }
  next();
}
```

Por enquanto, não crie a UI de admin. Apenas o endpoint.

TESTE: Com usuário admin, chame endpoint. Deve retornar logs de todos usuários.
```

### Prompt 3.7 - Política de retenção de logs

```
Implemente limpeza automática de logs antigos:

Opção 1 - Cron job no Supabase:
```sql
-- Função para limpar logs antigos (mais de 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Agendar via pg_cron ou Edge Function
```

Opção 2 - Permitir configuração por usuário:
- Settings: "Manter histórico por: 30 dias / 90 dias / 1 ano / Sempre"

TESTE: Insira log com data antiga (manual). Execute cleanup. Log deve ser removido.
```

### Prompt 3.8 - Alertas de segurança

```
Adicione detecção de atividade suspeita:

Patterns a detectar:
1. Muitas queries em pouco tempo (>100 em 1 minuto)
2. Login de localização diferente
3. Múltiplas tentativas de login falhadas
4. Query que retorna muitos dados (>10k rows)

Ao detectar:
- Enviar email de alerta (via Supabase Edge Function ou webhook)
- Logar como action: 'security_alert'
- Opcional: bloquear temporariamente

Para MVP, implemente apenas a detecção e log:
```typescript
if (queryResult.length > 10000) {
  await auditService.log({
    action: 'security_alert',
    details: { type: 'large_result', rowCount: queryResult.length }
  });
}
```

TESTE: Execute query que retorna muitos dados. Verifique log de alerta.
```

### Prompt 3.9 - Criptografia de dados sensíveis

```
Adicione criptografia para dados sensíveis no banco:

Dados que devem ser criptografados:
- connection_config em datasources (credenciais de banco)
- Queries SQL que podem conter dados sensíveis

Use Supabase Vault ou criptografia no backend:

```typescript
import { createCipheriv, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes

function encrypt(text: string): string { ... }
function decrypt(encrypted: string): string { ... }
```

Antes de salvar connection_config:
- Criptografar com encrypt()

Antes de usar:
- Descriptografar com decrypt()

TESTE: Salve conexão. Verifique no banco que connection_config está criptografado.
```

### Prompt 3.10 - Termos de uso e privacidade

```
Adicione páginas de termos e privacidade:

Rotas:
- /terms - Termos de Uso
- /privacy - Política de Privacidade

Conteúdo:
- Texto legal básico (pode ser placeholder para revisão jurídica)
- Formatação clara com headers
- Data da última atualização
- Links no footer de todas as páginas

No signup:
- Checkbox obrigatório "Li e aceito os Termos de Uso e Política de Privacidade"
- Logar aceite no audit_log

TESTE: Navegue para /terms e /privacy. Conteúdo deve carregar. Signup deve exigir aceite.
```

---

## ✅ Checklist de Verificação da Fase 7

Antes de passar para a Fase 8, verifique:

- [ ] Login com email/senha funciona
- [ ] Signup com email funciona
- [ ] Login com Google funciona
- [ ] Rotas protegidas redirecionam para login
- [ ] Header mostra info do usuário logado
- [ ] Logout funciona
- [ ] Recuperação de senha funciona
- [ ] Página de configurações funciona
- [ ] RLS habilitado nas tabelas
- [ ] Usuário A não vê dados de B
- [ ] Token enviado corretamente nas requests
- [ ] Audit log registrando queries
- [ ] Audit log registrando ações importantes
- [ ] Página de atividades funciona
- [ ] Dados sensíveis criptografados
- [ ] Nenhum erro no console
- [ ] Build de produção funciona
