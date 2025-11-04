# 📡 API Documentation

A API do AI Data Assistant fornece endpoints RESTful para interagir com dados através de linguagem natural.

## 🔗 Base URL

```
http://localhost:3001/api
```

## 🔐 Autenticação

A API suporta autenticação opcional via API Key:

```bash
# Header
X-API-Key: your-api-key

# Query parameter
?apiKey=your-api-key
```

## 📊 Data Endpoints

### GET /api/data/tables

Retorna todas as tabelas disponíveis.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "users",
      "schema": "public",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "isPrimaryKey": true
        }
      ],
      "primaryKey": ["id"]
    }
  ],
  "message": "Tables retrieved successfully"
}
```

### GET /api/data/tables/:tableName/columns

Retorna as colunas de uma tabela específica.

**Parameters:**
- `tableName` (string): Nome da tabela

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "id",
      "type": "uuid",
      "nullable": false,
      "isPrimaryKey": true
    }
  ]
}
```

### GET /api/data/tables/:tableName/sample

Retorna dados de amostra de uma tabela.

**Parameters:**
- `tableName` (string): Nome da tabela
- `size` (query, optional): Número de registros (default: 5)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "João Silva",
      "email": "joao@email.com"
    }
  ]
}
```

### POST /api/data/query

Executa uma consulta estruturada.

**Body:**
```json
{
  "tableName": "users",
  "filters": [
    {
      "column": "status",
      "operator": "eq",
      "value": "ativo"
    }
  ],
  "sorts": [
    {
      "column": "created_at",
      "direction": "desc"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "searchQuery": "joão"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...],
    "count": 147,
    "query": "SELECT * FROM users WHERE...",
    "executionTime": 24
  }
}
```

### POST /api/data/raw-sql

Executa SQL bruto (somente SELECT).

**Body:**
```json
{
  "sqlQuery": "SELECT COUNT(*) FROM users WHERE status = 'ativo'"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [{"count": 147}],
    "count": 1,
    "query": "SELECT COUNT(*) FROM users...",
    "executionTime": 12
  }
}
```

## 💬 Chat Endpoints

### POST /api/chat/message

Processa uma mensagem de chat em linguagem natural.

**Body:**
```json
{
  "message": "Quantos usuários estão ativos?",
  "sessionId": "session-123",
  "context": {
    "currentTable": "users",
    "availableTables": ["users", "orders"],
    "previousQueries": ["SELECT * FROM users"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg-456",
      "content": "Encontrei 147 usuários ativos no sistema.",
      "role": "assistant",
      "timestamp": "2024-01-15T10:30:00Z",
      "queryGenerated": "SELECT COUNT(*) FROM users WHERE status = 'ativo'",
      "resultsCount": 1
    },
    "queryResult": {
      "data": [{"count": 147}],
      "count": 1,
      "query": "SELECT COUNT(*) FROM users WHERE status = 'ativo'",
      "executionTime": 15
    },
    "confidence": 0.95,
    "sqlQuery": "SELECT COUNT(*) FROM users WHERE status = 'ativo'"
  }
}
```

### GET /api/chat/history/:sessionId

Retorna o histórico de chat de uma sessão.

**Parameters:**
- `sessionId` (string): ID da sessão

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-123",
      "content": "Quantos usuários temos?",
      "role": "user",
      "timestamp": "2024-01-15T10:25:00Z"
    },
    {
      "id": "msg-124",
      "content": "Temos 147 usuários cadastrados.",
      "role": "assistant",
      "timestamp": "2024-01-15T10:25:05Z",
      "queryGenerated": "SELECT COUNT(*) FROM users",
      "resultsCount": 1
    }
  ]
}
```

### DELETE /api/chat/history/:sessionId

Limpa o histórico de uma sessão.

**Response:**
```json
{
  "success": true,
  "message": "Chat history cleared successfully"
}
```

### GET /api/chat/suggestions

Retorna sugestões de perguntas.

**Response:**
```json
{
  "success": true,
  "data": [
    "Mostre todos os dados",
    "Quantos registros existem?",
    "Mostre os últimos 10 registros",
    "Filtre por data de hoje"
  ]
}
```

## 🏥 Health Endpoint

### GET /api/health

Verifica o status da API.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "uptime": 3600,
    "version": "1.0.0"
  },
  "message": "Server is running"
}
```

## 📝 Response Format

Todas as respostas seguem o padrão:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## 🚨 Error Handling

### Status Codes

- `200` - Sucesso
- `400` - Bad Request (dados inválidos)
- `401` - Unauthorized (API key inválida)
- `403` - Forbidden (sem permissão)
- `404` - Not Found (endpoint não encontrado)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Error Response

```json
{
  "success": false,
  "error": "Invalid table name"
}
```

## 🔢 Rate Limiting

- **Limite**: 100 requisições por 15 minutos por IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## 📊 Query Operators

Para filtros na API `/api/data/query`:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Igual | `{"column": "status", "operator": "eq", "value": "ativo"}` |
| `neq` | Diferente | `{"column": "status", "operator": "neq", "value": "inativo"}` |
| `gt` | Maior que | `{"column": "price", "operator": "gt", "value": 100}` |
| `gte` | Maior ou igual | `{"column": "price", "operator": "gte", "value": 100}` |
| `lt` | Menor que | `{"column": "price", "operator": "lt", "value": 500}` |
| `lte` | Menor ou igual | `{"column": "price", "operator": "lte", "value": 500}` |
| `like` | Contém (case-insensitive) | `{"column": "name", "operator": "like", "value": "joão"}` |
| `in` | Está em lista | `{"column": "category", "operator": "in", "value": ["A", "B"]}` |

## 🔧 Client Examples

### JavaScript/Fetch

```javascript
// Enviar mensagem no chat
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    message: 'Quantos usuários temos?',
    sessionId: 'session-123'
  })
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
# Obter tabelas
curl -X GET "http://localhost:3001/api/data/tables" \
  -H "X-API-Key: your-api-key"

# Enviar mensagem
curl -X POST "http://localhost:3001/api/chat/message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "message": "Quantos usuários temos?",
    "sessionId": "session-123"
  }'
```

### Python/Requests

```python
import requests

# Configuração
base_url = "http://localhost:3001/api"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "your-api-key"
}

# Obter tabelas
response = requests.get(f"{base_url}/data/tables", headers=headers)
tables = response.json()

# Enviar mensagem
payload = {
    "message": "Quantos usuários temos?",
    "sessionId": "session-123"
}
response = requests.post(f"{base_url}/chat/message", json=payload, headers=headers)
result = response.json()
```

## 🎯 Best Practices

1. **Use sessões consistentes** para manter contexto no chat
2. **Implemente retry logic** para requisições que falharam
3. **Cache resultados** quando apropriado
4. **Valide dados** antes de enviar para a API
5. **Use paginação** para datasets grandes
6. **Monitore rate limits** para evitar bloqueios