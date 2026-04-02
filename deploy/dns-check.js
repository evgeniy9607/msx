const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
echo "=== DNS проверка ==="
dig +short xxitv.ru A 2>/dev/null || nslookup xxitv.ru 2>/dev/null || host xxitv.ru 2>/dev/null
echo ""
echo "=== Ping ==="
ping -c 1 xxitv.ru 2>&1 | head -2
`;

conn.on('ready', () => {
  conn.exec(COMMAND, { pty: true }, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on('close', () => conn.end());
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
