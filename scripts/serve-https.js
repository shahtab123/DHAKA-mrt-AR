/**
 * HTTPS static server — required for camera on phone (LAN IP over HTTP is blocked).
 *
 * Usage: npm run serve:https
 * Phone: https://<LAN-IP>:3443/index.html  (accept certificate warning once)
 */
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');
const selfsigned = require('selfsigned');
const serveHandler = require('serve-handler');

const ROOT = path.join(__dirname, '..');
const TARGETS_FILE = path.join(ROOT, 'targets.mind');
const PORT = Number(process.env.PORT || 3443);
const CERT_DIR = path.join(__dirname, '../.certs');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');

function getLanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

async function loadOrCreateCerts() {
  if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) {
    return {
      key: fs.readFileSync(KEY_FILE),
      cert: fs.readFileSync(CERT_FILE),
    };
  }
  fs.mkdirSync(CERT_DIR, { recursive: true });
  const ip = getLanIp();
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        ...(ip !== '127.0.0.1' ? [{ type: 7, ip }] : []),
      ],
    }],
  });
  fs.writeFileSync(KEY_FILE, pems.private);
  fs.writeFileSync(CERT_FILE, pems.cert);
  return { key: pems.private, cert: pems.cert };
}

function handleRequest(req, res) {
  const pathname = (req.url || '').split('?')[0];

  if (req.method === 'POST' && pathname === '/api/save-targets') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        fs.writeFileSync(TARGETS_FILE, buf);
        console.log(`  ✓ Saved targets.mind (${(buf.length / 1024).toFixed(0)} KB)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: 'targets.mind', bytes: buf.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err.message) }));
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/targets-status') {
    const exists = fs.existsSync(TARGETS_FILE);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      exists,
      bytes: exists ? fs.statSync(TARGETS_FILE).size : 0,
    }));
    return;
  }

  return serveHandler(req, res, {
    public: ROOT,
    headers: [{ source: '**/*', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }],
  });
}

async function main() {
  const { key, cert } = await loadOrCreateCerts();
  const ip = getLanIp();
  const hasTargets = fs.existsSync(TARGETS_FILE);

  https
    .createServer({ key, cert }, handleRequest)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n  Port ${PORT} is already in use. Either:`);
        console.error(`    • Stop the other server (Task Manager → end node.exe), or`);
        console.error(`    • Use another port:  PORT=3444 npm run serve:https\n`);
      } else {
        console.error(err);
      }
      process.exit(1);
    })
    .listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('  Dhaka Metro AR — HTTPS dev server');
      console.log('  ─────────────────────────────────');
      console.log(`  PC:    https://localhost:${PORT}/index.html`);
      console.log(`  Phone: https://${ip}:${PORT}/index.html`);
      console.log(`  Compile: https://localhost:${PORT}/compile-target.html`);
      console.log(`  targets.mind: ${hasTargets ? '✓ ready' : '✗ missing — compile first'}`);
      console.log('');
      console.log('  Camera needs HTTPS on mobile. On first phone visit:');
      console.log('  Chrome → Advanced → Proceed (self-signed cert is OK for dev).');
      console.log('');
    });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
