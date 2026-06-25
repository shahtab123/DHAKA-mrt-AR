/**
 * Parse Dhaka MRT SVG — extract station markers and line paths.
 * Run: node scripts/parse-svg.js
 */
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/dhaka-metro-map.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

const LINE_COLORS = {
  st19: 'line6', st26: 'line6',
  st20: 'line5', st28: 'line5',
  st21: 'line4', st29: 'line4',
  st22: 'line1', st30: 'line1',
  st23: 'line2', st31: 'line2',
  st24: 'line3', st27: 'line3',
};

const circleRe = /class="(st1[89]|st2[0-4])"[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"/g;
const circles = [];
let m;
while ((m = circleRe.exec(svg)) !== null) {
  circles.push({ cls: m[1], cx: +m[2], cy: +m[3], line: LINE_COLORS[m[1]] || 'unknown' });
}

// Dedupe overlapping markers (same cx,cy within 0.5)
const unique = [];
for (const c of circles) {
  if (!unique.some(u => Math.abs(u.cx - c.cx) < 0.5 && Math.abs(u.cy - c.cy) < 0.5)) {
    unique.push(c);
  }
}

unique.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
console.log(JSON.stringify(unique, null, 2));
console.log('\nTotal unique station markers:', unique.length);
