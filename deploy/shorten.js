const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
# Добавляем короткий путь в Nginx
sed -i '/location \\/health/i \\
        # Короткий URL для MSX\\n\\
        location = /s.json {\\n\\
            alias /opt/msx/static/start.json;\\n\\
            add_header Access-Control-Allow-Origin * always;\\n\\
        }' /opt/msx/nginx/nginx.conf

# Перезапускаем Nginx
cd /opt/msx && docker compose restart nginx
echo "DONE"
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
