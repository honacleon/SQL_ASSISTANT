# 🤖 AI Data Assistant

Uma plataforma completa para conversar com bases de dados através de linguagem natural. O sistema permite fazer perguntas em português sobre seus dados e visualizar os resultados em uma interface moderna e intuitiva.

## ✨ Funcionalidades

### 🎯 Interface Dupla
- **📊 Tabela de dados**: Visualização interativa com filtros, ordenação e paginação
- **💬 Chat conversacional**: Interface de IA para perguntas em linguagem natural

### 🧠 Processamento de Linguagem Natural
- Converte perguntas em português para queries SQL
- Suporte para consultas complexas (filtros, agregações, joins)
- Respostas contextuais e explicativas

### 🗄️ Integração com Banco de Dados
- Suporte completo ao Supabase (PostgreSQL)
- Conexão segura e configurável
- Múltiplas tabelas e schemas

### 🚀 Funcionalidades Avançadas
- Exportação de dados (CSV, Excel, JSON)
- Histórico de conversas
- Sugestões inteligentes de consultas
- Interface responsiva
- Autenticação por API key

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com hooks modernos
- **TypeScript** para tipagem segura
- **TailwindCSS** para estilização
- **Vite** como bundler
- **Lucide React** para ícones
- **Recharts** para gráficos

### Backend
- **Node.js** + **Express**
- **TypeScript**
- **Supabase Client** para PostgreSQL
- **OpenAI** / **Anthropic Claude** para IA
- **Winston** para logging
- **Joi** para validação

### Banco de Dados
- **Supabase** (PostgreSQL)
- Estrutura otimizada com índices
- Dados de exemplo incluídos

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm 9+
- Conta no Supabase
- Chave da API OpenAI ou Anthropic

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd ai-data-assistant
```

### 2. Execute o script de instalação
```bash
# Linux/macOS
chmod +x scripts/setup.sh
./scripts/setup.sh

# Windows (via Git Bash)
bash scripts/setup.sh
```

### 3. Configure as variáveis de ambiente
```bash
# Copie o arquivo de exemplo (se não foi feito automaticamente)
cp .env.example .env

# Edite o arquivo .env com suas configurações
nano .env
```

### 4. Configure o banco de dados
1. Acesse seu painel do Supabase
2. Vá para SQL Editor
3. Execute o script `docs/supabase-setup.sql`

### 5. Inicie o projeto
```bash
# Modo desenvolvimento
npm run dev

# Ou use o script
./scripts/dev.sh
```

## ⚙️ Configuração

### Variáveis de Ambiente

Edite o arquivo `.env` com suas configurações:

```env
# Backend
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key

# IA (escolha um)
OPENAI_API_KEY=sua-chave-openai
# OU
ANTHROPIC_API_KEY=sua-chave-anthropic

# Opcional
API_KEY=sua-api-key-para-autenticacao
```

### Configuração do Supabase

1. **Crie um projeto** no [Supabase](https://supabase.com)
2. **Configure RLS** (Row Level Security) conforme necessário
3. **Execute o SQL** do arquivo `docs/supabase-setup.sql`
4. **Configure as variáveis** SUPABASE_URL e SUPABASE_SERVICE_KEY

## 🚀 Uso

### Interface Principal

1. **Selecione uma tabela** no menu superior
2. **Visualize os dados** na tabela interativa
3. **Faça perguntas** no chat à direita

### Exemplos de Perguntas

```
"Quantos pedidos foram aprovados este mês?"
"Mostre os produtos mais vendidos"
"Filtre usuários do estado de SP"
"Agrupe vendas por categoria"
"Qual o valor total por cliente?"
```

### Funcionalidades da Tabela

- **🔍 Busca**: Campo de pesquisa global
- **📊 Filtros**: Clique nos cabeçalhos para filtrar
- **↕️ Ordenação**: Clique para ordenar colunas
- **👁️ Visibilidade**: Toggle de colunas
- **📤 Export**: Exportar dados em CSV

## 📁 Estrutura do Projeto

```
ai-data-assistant/
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── services/        # APIs e serviços
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # Tipos TypeScript
├── backend/                  # Node.js + Express backend
│   ├── src/
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Serviços de negócio
│   │   ├── config/          # Configurações
│   │   └── middleware/      # Middlewares
├── shared/                   # Tipos e utilitários compartilhados
├── docs/                     # Documentação
├── scripts/                  # Scripts de automação
└── README.md
```

## 🧪 Desenvolvimento

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia todos os serviços
npm run dev:frontend     # Apenas frontend
npm run dev:backend      # Apenas backend

# Build
npm run build           # Build completo
npm run build:frontend  # Build frontend
npm run build:backend   # Build backend

# Testes
npm run test           # Todos os testes
npm run test:frontend  # Testes frontend
npm run test:backend   # Testes backend

# Qualidade
npm run lint           # ESLint
npm run typecheck      # TypeScript check
```

### Adicionando Novas Funcionalidades

1. **Frontend**: Componentes em `frontend/src/components/`
2. **Backend**: Rotas em `backend/src/routes/`
3. **Tipos**: Compartilhados em `shared/src/types/`
4. **Testes**: Seguir padrão `*.test.ts`

## 🌐 Deployment

### Build de Produção

```bash
# Build completo
npm run build

# Ou use o script
./scripts/build.sh
```

### Deploy Manual

1. Execute `npm run build`
2. Copie arquivos de `production/` para servidor
3. Configure variáveis de ambiente
4. Execute `npm start` no backend

### Deploy com Docker

```dockerfile
# Dockerfile exemplo
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 🔧 Troubleshooting

### Problemas Comuns

**❌ Erro de conexão com Supabase**
```
Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no .env
```

**❌ IA não responde**
```
Configure OPENAI_API_KEY ou ANTHROPIC_API_KEY
```

**❌ Dados não carregam**
```
Execute o script SQL do banco de dados
Verifique permissões no Supabase
```

### Logs

```bash
# Backend logs
tail -f backend/logs/combined.log

# Frontend logs
Console do navegador (F12)
```

## 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙋 Suporte

- 📧 **Issues**: Use o GitHub Issues para reportar bugs
- 💬 **Discussões**: GitHub Discussions para dúvidas
- 📖 **Wiki**: Documentação detalhada no Wiki

## 🎯 Roadmap

- [ ] Suporte a mais tipos de banco de dados
- [ ] Interface para criação de dashboards
- [ ] Integração com APIs externas
- [ ] Modo offline com cache
- [ ] Temas personalizáveis
- [ ] Suporte a múltiplos idiomas

---

**🚀 Feito com ❤️ para democratizar o acesso aos dados através de IA**