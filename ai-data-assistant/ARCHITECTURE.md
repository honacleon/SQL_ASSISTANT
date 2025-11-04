# AI Data Assistant - Arquitetura do Sistema

## Diagrama de Arquitetura

```mermaid
flowchart TD
    %% Frontend
    subgraph Frontend["Frontend (React + TypeScript + Vite)"]
        UI["Interface do Usuário<br/>Dashboard & Chat"]
        API_Client["Cliente API<br/>useApi Hook"]
    end
    
    %% Backend APIs
    subgraph Backend["Backend (Node.js + Express + TypeScript)"]
        API["API Routes<br/>Express Router"]
        
        subgraph Routes["Rotas da API"]
            ChatRoute["/api/chat/*<br/>Mensagens & Histórico"]
            DataRoute["/api/data/*<br/>Dados & Consultas"]
            HealthRoute["/api/health<br/>Status do Sistema"]
        end
        
        subgraph Services["Serviços Principais"]
            NLPService["NLPService<br/>Processamento NLP"]
            DatabaseService["DatabaseService<br/>Operações BD"]
            MultiAgentService["MultiAgentService<br/>Sistema Multiagente"]
        end
        
        subgraph Agents["Sistema Multiagente"]
            Coordinator["CoordinatorAgent<br/>Coordenação"]
            Schema["SchemaAgent<br/>Análise Schema"]
            SQL["SQLAgent<br/>Geração SQL"]
            Analyst["AnalystAgent<br/>Validação"]
            Formatter["FormatterAgent<br/>Formatação"]
        end
        
        subgraph External["Integrações Externas"]
            Supabase["Supabase<br/>Banco de Dados"]
            AI_Providers["Provedores IA<br/>Anthropic/OpenAI"]
        end
    end
    
    %% Fluxo de Dados
    UI --> API_Client
    API_Client --> API
    
    API --> ChatRoute
    API --> DataRoute
    API --> HealthRoute
    
    ChatRoute --> NLPService
    DataRoute --> DatabaseService
    
    NLPService --> MultiAgentService
    MultiAgentService --> Coordinator
    
    Coordinator --> Schema
    Coordinator --> SQL
    Coordinator --> Analyst
    Coordinator --> Formatter
    
    Schema --> DatabaseService
    SQL --> DatabaseService
    Analyst --> DatabaseService
    
    DatabaseService --> Supabase
    NLPService --> AI_Providers
    
    %% Contexto
    MultiAgentService --> Context["Contexto de Conversa<br/>Histórico & Estado"]
```

## Fluxo de Processamento Detalhado

### 1. Frontend (Interface do Usuário)
```mermaid
sequenceDiagram
    participant U as Usuário
    participant UI as Interface React
    participant API as Cliente API
    participant B as Backend
    
    U->>UI: Digita pergunta natural
    UI->>API: Envia mensagem via POST /api/chat/message
    API->>B: Requisição HTTP
    B->>B: Processa com MultiAgentService
    B->>B: Executa query no Supabase
    B->>API: Retorna resposta formatada
    API->>UI: Atualiza interface
    UI->>U: Exibe resultados
```

### 2. Backend - Sistema Multiagente
```mermaid
flowchart LR
    subgraph MultiAgentFlow["Fluxo Multiagente"]
        Input["Pergunta do Usuário"] --> Coordinator
        Coordinator --> Schema
        Schema --> SQL
        SQL --> Analyst
        Analyst --> Formatter
        Formatter --> Output["Resposta Formatada"]
    end
    
    Schema --> SchemaDB["Consulta Schema"]
    SQL --> SQLGen["Geração SQL"]
    Analyst --> Validation["Validação"]
    Formatter --> Format["Formatação"]
```

## Componentes Principais

### Frontend (`ai-data-assistant/frontend/`)
- **App.tsx**: Componente principal
- **Dashboard.tsx**: Visualização de dados
- **ChatInterface.tsx**: Interface de conversa
- **useApi.ts**: Hook para comunicação com API
- **api.ts**: Cliente HTTP

### Backend (`ai-data-assistant/backend/`)
- **index.ts**: Servidor Express principal
- **routes/chat.ts**: Endpoints de chat
- **routes/data.ts**: Endpoints de dados
- **services/nlp.ts**: Serviço NLP original
- **services/multiagent.ts**: Sistema multiagente
- **services/database.ts**: Operações de banco

### Sistema Multiagente
```mermaid
graph TB
    subgraph MultiAgent["Arquitetura Multiagente"]
        MA[MultiAgentService] --> C[CoordinatorAgent]
        C --> S[SchemaAgent]
        C --> SQ[SQLAgent]
        C --> A[AnalystAgent]
        C --> F[FormatterAgent]
        
        S --> SA[Análise Schema]
        SQ --> SG[Geração SQL]
        A --> VA[Validação Query]
        F --> FR[Formatação Resposta]
    end
```

## APIs Disponíveis

### Chat API (`/api/chat/`)
- `POST /message`: Processa mensagem do usuário
- `GET /history/:sessionId`: Recupera histórico
- `DELETE /history/:sessionId`: Limpa histórico
- `GET /suggestions`: Sugestões de consulta

### Data API (`/api/data/`)
- `GET /tables`: Lista tabelas disponíveis
- `POST /query`: Executa consulta SQL
- `GET /sample/:table`: Dados de amostra

### Health API (`/api/health`)
- `GET /`: Status do sistema

## Integrações Externas

### Supabase (PostgreSQL)
- **Tabelas**: users, products, etc.
- **Autenticação**: API Key + URL
- **Operações**: SELECT, COUNT, filtros

### Provedores de IA
- **Anthropic Claude**: Principal (prioritário)
- **OpenAI GPT-4**: Fallback
- **Configuração**: API Keys via environment

## Fluxo de Dados Completo

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant M as MultiAgent
    participant S as Supabase
    participant A as AI Provider
    
    U->>F: Pergunta natural
    F->>B: POST /api/chat/message
    B->>M: processQuery()
    M->>M: CoordinatorAgent inicia
    M->>M: SchemaAgent analisa
    M->>M: SQLAgent gera query
    M->>M: AnalystAgent valida
    M->>M: FormatterAgent formata
    M->>B: Retorna NLQueryResponse
    B->>S: Executa query SQL
    S->>B: Retorna dados
    B->>A: Gera resposta conversacional (opcional)
    A->>B: Texto formatado
    B->>F: Resposta completa
    F->>U: Exibe resultados
```

## Características Técnicas

### Performance
- **Cache de Schema**: Para otimização
- **Contexto Persistente**: Histórico de conversa
- **Fallback Inteligente**: Multiagente → IA tradicional

### Confiabilidade
- **Validação Multiagente**: 4 agentes especializados
- **Sistema de Confiança**: Scores de 0.0 a 1.0
- **Fallback Automático**: Em caso de falha

### Escalabilidade
- **Arquitetura Modular**: Facilita extensões
- **Stateless Design**: APIs RESTful
- **Logs Detalhados**: Monitoramento completo

## Configuração de Ambiente

```bash
# Backend (.env)
ANTHROPIC_API_KEY=chave_anthropic
OPENAI_API_KEY=chave_openai
SUPABASE_URL=url_supabase
SUPABASE_KEY=chave_supabase

# Frontend (.env)
VITE_API_URL=http://localhost:3001
```

Este diagrama representa a arquitetura completa do AI Data Assistant após a implementação do sistema multiagente, mostrando como todos os componentes interagem para fornecer uma experiência robusta de análise de dados via linguagem natural.