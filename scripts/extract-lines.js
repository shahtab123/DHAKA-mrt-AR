/**
 * Extract line geometry from Dhaka MRT SVG for AR overlay.
 * Run: node scripts/extract-lines.js
 */
const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync(path.join(__dirname, '../assets/dhaka-metro-map.svg'), 'utf8');

const CLASS_TO_LINE = {
  st1: 'line6',
  st2: 'line2', st3: 'line2', st24: 'line2', st27: 'line2', st35: 'line2',
  st4: 'line1', st5: 'line1', st6: 'line1', st7: 'line1', st8: 'line1', st9: 'line1',
  st10: 'line4', st11: 'line4', st12: 'line4', st13: 'line4',
  st14: 'line4b', st15: 'line4b', st16: 'line4b', st34: 'line4b',
  st17: 'line5', st18: 'line5',
};

const COLORS = {
  line6: '#006747', line1: '#DA291C', line2: '#08B7E3',
  line4: '#8031A7', line5: '#FF8200', line4b: '#003DA5',
};

function parsePoints(attr) {
  return attr.trim().split(/\s+/).map((pair) => {
    const [x, y] = pair.split(',').map(Number);
    return [x, y];
  }).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

const segments = [];

for (const m of svg.matchAll(/<polyline[^>]*class="(st\d+)"[^>]*points="([^"]+)"[^>]*\/?>/gs)) {
  const line = CLASS_TO_LINE[m[1]];
  if (!line) continue;
  const points = parsePoints(m[2]);
  if (points.length >= 2) segments.push({ line, points });
}

for (const m of svg.matchAll(/<line[^>]*class="(st\d+)"[^>]*x1="([\d.]+)"[^>]*y1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*y2="([\d.]+)"[^>]*\/?>/gs)) {
  const line = CLASS_TO_LINE[m[1]];
  if (!line) continue;
  segments.push({
    line,
    points: [[+m[2], +m[3]], [+m[4], +m[5]]],
  });
}

// path elements (metro curves as line segments)
for (const m of svg.matchAll(/<path[^>]*class="(st\d+)"[^>]*d="([^"]+)"[^>]*\/?>/gs)) {
  const line = CLASS_TO_LINE[m[1]];
  if (!line) continue;
  const d = m[2];
  const nums = d.match(/[-+]?[\d.]+(?:e[-+]?\d+)?/gi);
  if (!nums || nums.length < 4) continue;
  const points = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push([parseFloat(nums[i]), parseFloat(nums[i + 1])]);
  }
  if (points.length >= 2) segments.push({ line, points });
}

const out = path.join(__dirname, 'lines-data.json');
fs.writeFileSync(out, JSON.stringify({ segments, colors: COLORS }, null, 2));
console.log(`Wrote ${out}: ${segments.length} segments`);
