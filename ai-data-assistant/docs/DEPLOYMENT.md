# 🚀 Deployment Guide

Este guia cobre diferentes estratégias para fazer deploy do AI Data Assistant em produção.

## 📋 Pré-requisitos

- Node.js 18+ instalado no servidor
- Banco Supabase configurado
- Chave da API OpenAI ou Anthropic
- Domínio configurado (opcional)
- SSL/TLS configurado (recomendado)

## 🏗️ Build de Produção

### 1. Preparar o Build

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd ai-data-assistant

# Instalar dependências
npm run setup

# Configurar ambiente
cp .env.example .env
# Editar .env com configurações de produção

# Fazer build
npm run build
```

### 2. Estrutura de Produção

Após o build, você terá:

```
production/
├── backend/           # Servidor Node.js
├── frontend/          # Arquivos estáticos React
├── shared/            # Utilitários compartilhados
├── docs/              # Documentação
└── .env.example       # Exemplo de configuração
```

## 🖥️ Deploy em Servidor Próprio

### 1. Configuração do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciamento de processo
sudo npm install -g pm2

# Criar usuário para aplicação
sudo useradd -r -s /bin/bash aidata
sudo mkdir -p /opt/ai-data-assistant
sudo chown aidata:aidata /opt/ai-data-assistant
```

### 2. Upload dos Arquivos

```bash
# Via SCP
scp -r production/* usuario@servidor:/opt/ai-data-assistant/

# Via Git (alternativo)
cd /opt/ai-data-assistant
git clone <url-do-repositorio> .
npm run build
```

### 3. Configuração da Aplicação

```bash
# Configurar ambiente
cd /opt/ai-data-assistant
cp .env.example .env
nano .env
```

Arquivo `.env` de produção:

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://seudominio.com

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key-producao

OPENAI_API_KEY=sua-chave-producao
# OU
ANTHROPIC_API_KEY=sua-chave-anthropic-producao

API_KEY=sua-api-key-super-secreta

LOG_LEVEL=warn
```

### 4. Instalar Dependências

```bash
cd /opt/ai-data-assistant/backend
npm ci --only=production

cd /opt/ai-data-assistant/shared
npm ci --only=production
```

### 5. Configurar PM2

```bash
# Criar arquivo de configuração
cat > /opt/ai-data-assistant/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ai-data-assistant',
    cwd: '/opt/ai-data-assistant/backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/opt/ai-data-assistant/logs/err.log',
    out_file: '/opt/ai-data-assistant/logs/out.log',
    log_file: '/opt/ai-data-assistant/logs/combined.log',
    time: true
  }]
}
EOF

# Criar diretório de logs
mkdir -p /opt/ai-data-assistant/logs

# Iniciar aplicação
cd /opt/ai-data-assistant
pm2 start ecosystem.config.js

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

### 6. Configurar Nginx (Proxy Reverso)

```bash
# Instalar Nginx
sudo apt install nginx -y

# Configurar site
sudo nano /etc/nginx/sites-available/ai-data-assistant
```

Configuração do Nginx:

```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;

    # Certificados SSL (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Frontend estático
    location / {
        root /opt/ai-data-assistant/frontend;
        try_files $uri $uri/ /index.html;

        # Cache para arquivos estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
    gzip_comp_level 9;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/ai-data-assistant /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 7. Configurar SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## ☁️ Deploy na Nuvem

### 🐳 Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/production ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3001

CMD ["node", "backend/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  ai-data-assistant:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - ai-data-assistant
    restart: unless-stopped
```

### ☁️ Vercel (Frontend apenas)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy do frontend
cd frontend
vercel --prod
```

`vercel.json`:
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://seu-backend.herokuapp.com/api/$1"
    },
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

### ☁️ Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login
heroku login

# Criar app
heroku create ai-data-assistant-prod

# Configurar variáveis
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=sua-url
heroku config:set SUPABASE_SERVICE_KEY=sua-key
heroku config:set OPENAI_API_KEY=sua-key

# Deploy
git push heroku main
```

`Procfile`:
```
web: node backend/dist/index.js
```

### ☁️ Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway deploy
```

`railway.json`:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

## 📊 Monitoramento

### 1. Logs

```bash
# PM2 logs
pm2 logs ai-data-assistant

# Logs do sistema
tail -f /opt/ai-data-assistant/logs/combined.log

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Health Checks

```bash
# Script de monitoramento
cat > /opt/ai-data-assistant/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://seudominio.com/api/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $STATUS -eq 200 ]; then
    echo "✅ Service is healthy"
    exit 0
else
    echo "❌ Service is down (HTTP $STATUS)"
    # Opcionalmente reiniciar serviço
    pm2 restart ai-data-assistant
    exit 1
fi
EOF

chmod +x /opt/ai-data-assistant/health-check.sh

# Adicionar ao crontab para executar a cada 5 minutos
echo "*/5 * * * * /opt/ai-data-assistant/health-check.sh" | crontab -
```

### 3. Métricas com PM2 Plus

```bash
# Conectar ao PM2 Plus
pm2 plus

# Configurar métricas personalizadas
pm2 install pm2-server-monit
```

## 🔒 Segurança

### 1. Firewall

```bash
# Configurar UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow from trusted.ip.address to any port 3001
```

### 2. Backup

```bash
# Script de backup
cat > /opt/backup-ai-data.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup da aplicação
tar -czf $BACKUP_DIR/app.tar.gz -C /opt ai-data-assistant

# Backup do banco (se aplicável)
# pg_dump $DATABASE_URL > $BACKUP_DIR/database.sql

# Limpar backups antigos (>7 dias)
find /opt/backups -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x /opt/backup-ai-data.sh

# Executar diariamente
echo "0 2 * * * /opt/backup-ai-data.sh" | crontab -
```

## 🔄 Atualizações

### 1. Deploy Automatizado

```bash
# Script de deploy
cat > /opt/ai-data-assistant/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/ai-data-assistant

echo "🔄 Starting deployment..."

# Backup atual
cp -r production production.backup.$(date +%s)

# Pull código
git pull origin main

# Build
npm run build

# Restart serviços
pm2 restart ai-data-assistant

echo "✅ Deployment completed!"
EOF

chmod +x /opt/ai-data-assistant/deploy.sh
```

### 2. Blue-Green Deploy

```bash
# Implementar estratégia blue-green
# Manter duas versões da aplicação
# Alternar entre elas via Nginx
```

## 🚨 Troubleshooting

### Problemas Comuns

**❌ Application won't start**
```bash
# Verificar logs
pm2 logs ai-data-assistant

# Verificar variáveis de ambiente
pm2 env ai-data-assistant

# Restart
pm2 restart ai-data-assistant
```

**❌ Database connection issues**
```bash
# Verificar conectividade
curl -I https://seu-projeto.supabase.co

# Testar credenciais
node -e "console.log(process.env.SUPABASE_SERVICE_KEY)"
```

**❌ High memory usage**
```bash
# Monitorar recursos
pm2 monit

# Configurar cluster mode
pm2 reload ecosystem.config.js
```

### Performance Tuning

```bash
# Otimizar Node.js
export NODE_OPTIONS="--max-old-space-size=2048"

# Configurar PM2 para cluster
instances: 'max'  # no ecosystem.config.js

# Cache no Nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;
proxy_cache api_cache;
proxy_cache_valid 200 5m;
```

---

🎯 **Deploy bem-sucedido = aplicação segura, performante e monitorada!**