require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
# Останавливаем Docker nginx чтобы освободить порт 80 для certbot
cd /opt/msx && docker compose stop nginx

# Получаем SSL сертификат
certbot certonly --standalone -d xxitv.ru -d www.xxitv.ru --non-interactive --agree-tos --email admin@xxitv.ru

# Обновляем Nginx с SSL
cat > /opt/msx/nginx/nginx.conf << 'NGINX'
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    gzip on;
    gzip_types application/json text/plain text/css application/javascript;

    # HTTP → HTTPS redirect
    server {
        listen 80;
        server_name xxitv.ru www.xxitv.ru;
        return 301 https://xxitv.ru$request_uri;
    }

    # Оставляем HTTP для IP (MSX на ТВ может не поддерживать HTTPS)
    server {
        listen 80;
        server_name 155.212.247.44;

        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;

        location = / {
            alias /opt/msx/static/;
            index start.json;
            add_header Access-Control-Allow-Origin * always;
            add_header Content-Type application/json;
        }

        location /msx/ {
            alias /opt/msx/static/;
            try_files $uri $uri/ =404;
            expires 5m;
        }

        location /api/ {
            proxy_pass http://msx-api:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /torrserver/ {
            proxy_pass http://torrserver:8090/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /health {
            return 200 '{"status":"ok"}';
            add_header Content-Type application/json;
        }
    }

    # HTTPS
    server {
        listen 443 ssl;
        server_name xxitv.ru www.xxitv.ru;

        ssl_certificate /etc/letsencrypt/live/xxitv.ru/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/xxitv.ru/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;

        location = / {
            alias /opt/msx/static/;
            index start.json;
            add_header Access-Control-Allow-Origin * always;
            add_header Content-Type application/json;
        }

        location /msx/ {
            alias /opt/msx/static/;
            try_files $uri $uri/ =404;
            expires 5m;
        }

        location /api/ {
            proxy_pass http://msx-api:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /torrserver/ {
            proxy_pass http://torrserver:8090/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        location /health {
            return 200 '{"status":"ok"}';
            add_header Content-Type application/json;
        }
    }
}
NGINX

# Обновляем docker-compose чтобы nginx видел SSL сертификаты
cat > /opt/msx/docker-compose.yml << 'COMPOSE'
services:
  nginx:
    image: nginx:alpine
    container_name: msx-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./static:/opt/msx/static:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - msx-api
      - torrserver
    restart: unless-stopped

  msx-api:
    build: ./api
    container_name: msx-api
    restart: unless-stopped

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

# Запускаем всё
cd /opt/msx && docker compose up -d --build
echo "SSL DONE"
`;

conn.on('ready', () => {
  console.log('Подключено...');
  conn.exec(COMMAND, { pty: true }, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', (code) => {
      console.log('Готово (код: ' + code + ')');
      conn.end();
    });
    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
});

conn.on('error', (err) => console.error('Ошибка:', err.message));

conn.connect({
  host: process.env.VPS_HOST,
  port: 22,
  username: process.env.VPS_USER,
  password: process.env.VPS_PASSWORD,
  readyTimeout: 15000
});
