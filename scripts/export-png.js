/**
 * Export SVG → PNG at 1800px width (white background for print tracking).
 * Run: node scripts/export-png.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');

const svgPath = path.join(__dirname, '../assets/dhaka-metro-map.svg');
const outPath = path.join(__dirname, '../assets/dhaka-metro-map.png');

const TARGET_WIDTH = 1800;
const VB_W = 578;
const VB_H = 592.6;
const TARGET_HEIGHT = Math.round(TARGET_WIDTH * (VB_H / VB_W));

const svg = fs.readFileSync(svgPath, 'utf8');
const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: TARGET_WIDTH },
  background: '#ffffff',
});
const pngData = resvg.render().asPng();

fs.writeFileSync(outPath, pngData);

sharp(outPath)
  .metadata()
  .then((m) => console.log(`PNG exported: ${outPath} (${m.width}×${m.height})`));
