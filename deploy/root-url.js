require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
# Добавляем root path который отдаёт start.json
sed -i '/location = \\/s.json/i \\
        # Root — просто IP\\n\\
        location = / {\\n\\
            alias /opt/msx/static/;\\n\\
            index start.json;\\n\\
            add_header Access-Control-Allow-Origin * always;\\n\\
            add_header Content-Type application/json;\\n\\
        }' /opt/msx/nginx/nginx.conf

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
  host: process.env.VPS_HOST,
  port: 22,
  username: process.env.VPS_USER,
  password: process.env.VPS_PASSWORD,
  readyTimeout: 15000
});
