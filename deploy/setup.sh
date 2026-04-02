#!/bin/bash
# ==============================================
# MSX Smart TV Portal — VPS Setup Script
# Автоматическое развёртывание всех сервисов
# ==============================================

set -e

SERVER_IP="155.212.247.44"
PROJECT_DIR="/opt/msx"
GITHUB_REPO="https://github.com/evgeniy9607/msx.git"

echo "============================================"
echo "  MSX Smart TV Portal — Установка"
echo "============================================"

# 1. Обновление системы
echo "[1/7] Обновление системы..."
apt update && apt upgrade -y
apt install -y curl wget git ufw htop nano

# 2. Установка Docker
echo "[2/7] Установка Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Установка Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt install -y docker-compose-plugin
fi

echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker compose version)"

# 3. Создание структуры проекта
echo "[3/7] Создание структуры проекта..."
mkdir -p $PROJECT_DIR/{api,nginx,torrserver,data}

# 4. Клонирование репозитория
echo "[4/7] Клонирование репозитория..."
if [ -d "$PROJECT_DIR/static" ]; then
    cd $PROJECT_DIR/static && git pull
else
    git clone $GITHUB_REPO $PROJECT_DIR/static
fi

# 5. Создание конфигов (генерируются ниже)
echo "[5/7] Создание конфигурационных файлов..."

# --- Nginx ---
cat > $PROJECT_DIR/nginx/nginx.conf << 'NGINX'
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    # Gzip
    gzip on;
    gzip_types application/json text/plain text/css application/javascript;

    # CORS headers
    map $http_origin $cors_origin {
        default "*";
    }

    # MSX API
    server {
        listen 80;
        server_name _;

        # CORS для MSX
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;

        # Статические файлы (клон GitHub Pages)
        location /msx/ {
            alias /opt/msx/static/;
            try_files $uri $uri/ =404;
            expires 5m;
        }

        # MSX API — динамические каналы
        location /api/ {
            proxy_pass http://msx-api:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # TorrServer
        location /torrserver/ {
            proxy_pass http://torrserver:8090/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Health check
        location /health {
            return 200 '{"status":"ok"}';
            add_header Content-Type application/json;
        }
    }
}
NGINX

# --- MSX API (Node.js) ---
cat > $PROJECT_DIR/api/package.json << 'PKGJSON'
{
  "name": "msx-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "node-fetch": "^2.7.0"
  }
}
PKGJSON

cat > $PROJECT_DIR/api/server.js << 'SERVERJS'
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Каналы с основным и резервным потоком
const channels = [
  {
    id: "perviy",
    label: "Первый канал",
    sublabel: "Прямой эфир",
    domain: "1tv.ru",
    color: "#003087",
    streams: [
      "https://zabava-htlive.cdn.ngenix.net/hls/CH_1TVHD/variant.m3u8"
    ]
  },
  {
    id: "russia1",
    label: "Россия 1",
    sublabel: "Прямой эфир",
    domain: "russia.tv",
    color: "#C8102E",
    streams: [
      "https://vgtrkregion-reg.cdnvideo.ru/vgtrk/0/russia1-hd/index.m3u8"
    ]
  },
  {
    id: "russia24",
    label: "Россия 24",
    sublabel: "Новости 24/7",
    domain: "russia.tv",
    color: "#1A3A6C",
    streams: [
      "https://vgtrkregion-reg.cdnvideo.ru/vgtrk/0/russia24-hd/720p.m3u8"
    ]
  },
  {
    id: "ntv",
    label: "НТВ",
    sublabel: "Прямой эфир",
    domain: "ntv.ru",
    color: "#007A33",
    streams: [
      "https://cdn.ntv.ru/ntv0/playlist.m3u8"
    ]
  },
  {
    id: "zvezda",
    label: "Звезда",
    sublabel: "Прямой эфир",
    domain: "tvzvezda.ru",
    color: "#CC0000",
    streams: [
      "https://tvchannelstream1.tvzvezda.ru/cdn/tvzvezda/playlist.m3u8"
    ]
  },
  {
    id: "pyatnica",
    label: "Пятница",
    sublabel: "Развлечения",
    domain: "friday.ru",
    color: "#FF4F00",
    streams: [
      "https://vod.tuva.ru/friday/index.m3u8"
    ]
  },
  {
    id: "mult",
    label: "Мульт",
    sublabel: "Детский канал",
    domain: "smotrim.ru",
    color: "#F5A623",
    streams: [
      "https://zabava-htlive.cdn.ngenix.net/hls/CH_MULT/variant.m3u8"
    ]
  }
];

// Кеш статусов каналов
let channelStatus = {};

// Проверка доступности потока
async function checkStream(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok || res.status === 302 || res.status === 301;
  } catch (e) {
    return false;
  }
}

// Мониторинг всех каналов
async function monitorChannels() {
  console.log(`[${new Date().toISOString()}] Проверка каналов...`);
  for (const channel of channels) {
    let workingStream = null;
    for (const stream of channel.streams) {
      const ok = await checkStream(stream);
      if (ok) {
        workingStream = stream;
        break;
      }
    }
    channelStatus[channel.id] = {
      online: !!workingStream,
      stream: workingStream,
      checkedAt: new Date().toISOString()
    };
    const status = workingStream ? '✓' : '✗';
    console.log(`  ${status} ${channel.label}`);
  }
}

// Проверка каждые 5 минут
monitorChannels();
setInterval(monitorChannels, 5 * 60 * 1000);

// === API Endpoints ===

// MSX Content JSON — только рабочие каналы
app.get('/tv', (req, res) => {
  const items = channels
    .filter(ch => channelStatus[ch.id]?.online)
    .map(ch => ({
      label: ch.label,
      sublabel: ch.sublabel,
      image: `https://www.google.com/s2/favicons?domain=${ch.domain}&sz=128`,
      color: ch.color,
      action: `video:${channelStatus[ch.id].stream}`
    }));

  res.json({
    type: "list",
    compress: true,
    headline: "ТВ Каналы (Live)",
    template: {
      type: "default",
      layout: "0,0,6,1",
      color: "msx-glass",
      imageFiller: "height-left"
    },
    items: items.length > 0 ? items : [{
      label: "Нет доступных каналов",
      sublabel: "Попробуйте позже",
      icon: "error",
      color: "#FF0000"
    }]
  });
});

// Статус всех каналов (для админки)
app.get('/status', (req, res) => {
  const result = channels.map(ch => ({
    id: ch.id,
    label: ch.label,
    online: channelStatus[ch.id]?.online || false,
    stream: channelStatus[ch.id]?.stream || null,
    checkedAt: channelStatus[ch.id]?.checkedAt || null
  }));
  res.json(result);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Принудительная проверка
app.get('/check', async (req, res) => {
  await monitorChannels();
  res.json({ status: 'ok', message: 'Проверка завершена' });
});

app.listen(PORT, () => {
  console.log(`MSX API запущен на порту ${PORT}`);
});
SERVERJS

cat > $PROJECT_DIR/api/Dockerfile << 'DOCKERFILE'
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY server.js .
EXPOSE 3000
CMD ["node", "server.js"]
DOCKERFILE

# --- Docker Compose ---
cat > $PROJECT_DIR/docker-compose.yml << COMPOSE
version: "3.8"

services:
  # Nginx — reverse proxy
  nginx:
    image: nginx:alpine
    container_name: msx-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./static:/opt/msx/static:ro
    depends_on:
      - msx-api
      - torrserver
    restart: unless-stopped

  # MSX API — динамические каналы + мониторинг
  msx-api:
    build: ./api
    container_name: msx-api
    restart: unless-stopped

  # TorrServer — стриминг торрентов для Lampa
  torrserver:
    image: ghcr.io/yourok/torrserver:latest
    container_name: torrserver
    ports:
      - "8090:8090"
    volumes:
      - ./torrserver/config:/opt/ts/config
      - ./data/torrserver:/opt/ts/data
    restart: unless-stopped

COMPOSE

# 6. Настройка файрвола
echo "[6/7] Настройка файрвола..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8090/tcp
ufw --force enable

# 7. Запуск
echo "[7/7] Запуск сервисов..."
cd $PROJECT_DIR
docker compose up -d --build

echo ""
echo "============================================"
echo "  Установка завершена!"
echo "============================================"
echo ""
echo "  MSX портал (статика): http://$SERVER_IP/msx/start.json"
echo "  MSX API (каналы):     http://$SERVER_IP/api/tv"
echo "  Статус каналов:       http://$SERVER_IP/api/status"
echo "  TorrServer:           http://$SERVER_IP:8090"
echo "  Health check:         http://$SERVER_IP/health"
echo ""
echo "  Стартовый URL для MSX:"
echo "  http://$SERVER_IP/msx/start.json"
echo ""
echo "  Для Lampa TorrServer:"
echo "  http://$SERVER_IP:8090"
echo ""
echo "  ВАЖНО: Смените пароль root!"
echo "  passwd"
echo ""
