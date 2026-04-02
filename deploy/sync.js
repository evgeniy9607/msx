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
  host: '155.212.247.44',
  port: 22,
  username: 'root',
  password: 'REDACTED',
  readyTimeout: 15000
});
