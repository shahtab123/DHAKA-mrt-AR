/**
 * Full map overlay from Wikipedia SVG — lines, station dots, and ALL labels (st33).
 * Only removes the gray city boundary (st0). Transparent background.
 * Source: https://en.wikipedia.org/wiki/File:Dhaka_MRT_Network_(en).svg
 *
 * Run: npm run export-overlay
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, '../assets/dhaka-metro-map.svg');
const outPath = path.join(__dirname, '../assets/dhaka-metro-overlay.png');
const TARGET_WIDTH = 1800;

let svg = fs.readFileSync(svgPath, 'utf8');

// Remove city boundary fill only — keep st33 label paths exactly as in the SVG
svg = svg.replace(/<path[^>]*class="st0"[^>]*\/>/g, '');
svg = svg.replace(/<path[^>]*class="st0"[^>]*>[\s\S]*?<\/path>/g, '');

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: TARGET_WIDTH },
  background: 'transparent',
});
fs.writeFileSync(outPath, resvg.render().asPng());
console.log(`Wrote ${outPath} (lines + stations + Wikipedia labels, no city fill)`);
