/**
 * Export AR card PNG with embedded QR code (local dev URL by default).
 *
 * Usage:
 *   node scripts/export-card.js
 *   AR_URL=http://192.168.1.5:3000/index.html node scripts/export-card.js
 *   PORT=8080 node scripts/export-card.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, '../assets/ar-card.svg');
const outPath = path.join(__dirname, '../assets/ar-card.png');
const urlPath = path.join(__dirname, '../assets/ar-card-url.txt');
const TARGET_WIDTH = 1800;
const PORT = process.env.PORT || 3443;

function getLanIp() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function buildArUrl() {
  if (process.env.AR_URL) return process.env.AR_URL;
  const host = getLanIp();
  // HTTPS required on phone — HTTP LAN URLs block camera (not secure)
  return `https://${host}:${PORT}/index.html`;
}

async function main() {
  const arUrl = buildArUrl();
  const qrDataUri = await QRCode.toDataURL(arUrl, {
    width: 512,
    margin: 1,
    color: { dark: '#111111', light: '#ffffff' },
  });

  let svg = fs.readFileSync(svgPath, 'utf8');

  // Replace QR placeholder box + label with real QR image
  svg = svg.replace(
    /<rect x="1120" y="580" width="200" height="200"[^/]*\/>\s*<text x="1220" y="690"[^/]*\/>\s*/,
    `<image href="${qrDataUri}" x="1120" y="580" width="200" height="200"/>\n  `
  );

  // Show the encoded URL on the card (truncated if long)
  const label = arUrl.replace(/^https?:\/\//, '');
  const display = label.length > 48 ? label.slice(0, 45) + '…' : label;
  svg = svg.replace(
    /<text x="750" y="780"[^>]*>[^<]*<\/text>/,
    `<text x="750" y="780" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#006747">${display}</text>`
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: TARGET_WIDTH },
    background: 'white',
  });
  fs.writeFileSync(outPath, resvg.render().asPng());
  fs.writeFileSync(urlPath, arUrl + '\n');

  console.log(`QR URL:  ${arUrl}`);
  console.log(`Saved:   ${outPath}`);
  console.log(`URL log: ${urlPath}`);
  console.log('\nPhone must be on the same Wi-Fi. Recompile targets.mind if you reprint the card.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
