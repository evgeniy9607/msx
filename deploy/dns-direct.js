require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `
echo "=== Через NS AdminVPS ==="
dig @ns1.adminvps.ru xxitv.ru A +short 2>/dev/null
echo ""
echo "=== Через ns3 ==="
dig @ns3.adminvps.ru xxitv.ru A +short 2>/dev/null
echo ""
echo "=== whois NS ==="
whois xxitv.ru 2>/dev/null | grep -i "nserver" || echo "whois не установлен"
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
  host: process.env.VPS_HOST,
  port: 22,
  username: process.env.VPS_USER,
  password: process.env.VPS_PASSWORD,
  readyTimeout: 15000
});
