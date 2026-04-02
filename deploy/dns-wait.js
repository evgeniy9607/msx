const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
echo "=== Проверка DNS через публичные серверы ==="
echo "Google DNS (8.8.8.8):"
dig @8.8.8.8 xxitv.ru A +short 2>/dev/null || nslookup xxitv.ru 8.8.8.8 2>/dev/null | grep Address | tail -1
echo ""
echo "Cloudflare DNS (1.1.1.1):"
dig @1.1.1.1 xxitv.ru A +short 2>/dev/null || nslookup xxitv.ru 1.1.1.1 2>/dev/null | grep Address | tail -1
echo ""
echo "Системный DNS:"
dig xxitv.ru A +short 2>/dev/null || nslookup xxitv.ru 2>/dev/null | grep Address | tail -1
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
