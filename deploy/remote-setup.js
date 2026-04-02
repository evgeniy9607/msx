const { Client } = require('./node_modules/ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const HOST = '155.212.247.44';
const PASSWORD = 'REDACTED';

// Читаем скрипт setup.sh
const setupScript = fs.readFileSync(path.join(__dirname, 'setup.sh'), 'utf8');

// Сначала убиваем зависшие процессы apt, потом запускаем скрипт
const COMMANDS = `
# Убиваем зависшие процессы
kill -9 $(pidof dpkg) 2>/dev/null || true
kill -9 $(pidof apt) 2>/dev/null || true
kill -9 $(pidof apt-get) 2>/dev/null || true
dpkg --configure -a 2>/dev/null || true
rm -f /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/cache/apt/archives/lock /var/lib/dpkg/lock 2>/dev/null || true

# Записываем скрипт
cat > /tmp/setup.sh << 'SETUPEOF'
${setupScript}
SETUPEOF

chmod +x /tmp/setup.sh
bash /tmp/setup.sh
`;

conn.on('ready', () => {
  console.log('=== Подключено к серверу ' + HOST + ' ===');
  conn.exec(COMMANDS, { pty: true }, (err, stream) => {
    if (err) { console.error('Ошибка:', err); conn.end(); return; }
    stream.on('close', (code) => {
      console.log('\n=== Скрипт завершён (код: ' + code + ') ===');
      conn.end();
    });
    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
});

conn.on('error', (err) => {
  console.error('Ошибка подключения:', err.message);
});

conn.connect({
  host: HOST,
  port: 22,
  username: 'root',
  password: PASSWORD,
  readyTimeout: 15000
});
