const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
# Устанавливаем certbot для SSL
apt install -y certbot python3-certbot-nginx 2>/dev/null || true

# Обновляем Nginx конфиг с доменом
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

    server {
        listen 80;
        server_name xxitv.ru www.xxitv.ru 155.212.247.44;

        # CORS для MSX
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;

        # Root — просто домен/IP = start.json
        location = / {
            alias /opt/msx/static/;
            index start.json;
            add_header Access-Control-Allow-Origin * always;
            add_header Content-Type application/json;
        }

        # Статические файлы
        location /msx/ {
            alias /opt/msx/static/;
            try_files $uri $uri/ =404;
            expires 5m;
        }

        # MSX API
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

# Перезапускаем Nginx
cd /opt/msx && docker compose restart nginx
echo "DOMAIN CONFIGURED"
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
  host: '155.212.247.44',
  port: 22,
  username: 'root',
  password: 'REDACTED',
  readyTimeout: 15000
});
