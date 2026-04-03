require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('./node_modules/ssh2');

const conn = new Client();

const COMMAND = `cd /opt/msx/static && git pull && echo "SYNCED OK"`;

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
