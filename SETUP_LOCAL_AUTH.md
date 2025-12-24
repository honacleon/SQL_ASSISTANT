# 🛠️ Configuração Local de Autenticação (Atualizado)

Já criei os arquivos de configuração necessários para você. Siga estes passos finais para rodar a aplicação:

## 1. Completar Configuração Backend
O arquivo `backend/.env` foi criado, mas você precisa adicionar a chave secreta:
1. Abra `backend/.env`.
2. Substitua `SUA_KEY_AQUI` pela sua **Service Role Key** (pegue no Supabase Dashboard > Project Settings > API).

## 2. Instalar Dependências Novas
As dependências já foram instaladas automaticamente. Caso precise reinstalar:

```bash
cd backend
npm install
```

## 3. Rodar a Aplicação
Em terminais separados:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
npm run dev
```

## 4. Testar
Acesse [http://localhost:5173/auth](http://localhost:5173/auth).
- Crie uma conta ("Criar Conta").
- Verifique se a organização foi criada automaticamente.
- O sistema agora usa JWT seguro e valida as regras de negócio multi-tenant.
