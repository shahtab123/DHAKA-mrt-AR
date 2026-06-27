/**
 * Map overlay export.
 * Legend: original icons/text scaled to 65% of original size.
 * Map labels: colored per mode, scaled 1.12x per-path.
 * Run: npm run export-overlay
 */
const fs   = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath   = path.join(__dirname, '../assets/dhaka-metro-map.svg');
const assetsDir = path.join(__dirname, '../assets');
const TARGET_WIDTH = 1800;
const TEXT_SCALE   = 1.0;  // original SVG label size — no per-glyph distortion
const LEG_SCALE    = 0.65;   // shrink the legend to 65% — change to taste
const LEG_MOVE_X   = 90;    // shift legend right by this many SVG units

// Original legend bounding box (rect1524 in SVG)
const LEG = { x: 11.7, y: 455.7, w: 277.3, h: 128.2 };

const ST33_RE = /<path[^>]*class="st33"[^>]*(?:\/>|>[\s\S]*?<\/path>)/g;

function removeSt0(svg) {
  return svg
    .replace(/<path[^>]*class="st0"[^>]*\/>/g, '')
    .replace(/<path[^>]*class="st0"[^>]*>[\s\S]*?<\/path>/g, '');
}
function removeSt33(svg) {
  return svg
    .replace(/<path[^>]*class="st33"[^>]*\/>/g, '')
    .replace(/<path[^>]*class="st33"[^>]*>[\s\S]*?<\/path>/g, '');
}
function firstM(p) {
  const m = p.match(/d="[^"]*?M\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i);
  return m ? { x: +m[1], y: +m[2] } : null;
}
function inLegend(p) {
  const pt = firstM(p);
  if (!pt) return false;
  return pt.x >= LEG.x && pt.x <= LEG.x + LEG.w &&
         pt.y >= LEG.y && pt.y <= LEG.y + LEG.h;
}
function scalePath(p) {
  if (TEXT_SCALE === 1) return p;
  const pt = firstM(p);
  if (!pt) return p;
  return `<g transform="translate(${pt.x},${pt.y}) scale(${TEXT_SCALE}) translate(${-pt.x},${-pt.y})">${p}</g>`;
}

/** Extract and remove all <circle> elements whose cx/cy fall inside the legend box */
function extractLegendCircles(svg) {
  const circles = [];
  const CIRCLE_RE = /<circle[^>]*\/>/g;
  let m;
  while ((m = CIRCLE_RE.exec(svg)) !== null) {
    const el = m[0];
    const cxM = el.match(/cx="(-?\d+\.?\d*)"/);
    const cyM = el.match(/cy="(-?\d+\.?\d*)"/);
    if (!cxM || !cyM) continue;
    const cx = +cxM[1], cy = +cyM[1];
    if (cx >= LEG.x && cx <= LEG.x + LEG.w && cy >= LEG.y && cy <= LEG.y + LEG.h) {
      circles.push(el);
    }
  }
  // Remove them from the SVG body
  circles.forEach(el => { svg = svg.replace(el, ''); });
  return { svg, circles };
}

function buildOverlaySvg(labelFill) {
  let svg = removeSt0(fs.readFileSync(svgPath, 'utf8'));

  // 1. Pull out all st33 paths before stripping them
  const allSt33    = svg.match(ST33_RE) || [];
  const legendSt33 = allSt33.filter(p =>  inLegend(p));
  const mapSt33    = allSt33.filter(p => !inLegend(p));

  // 2. Remove all st33 from SVG body; set map label CSS colour
  svg = removeSt33(svg);
  svg = svg.replace(/\.st33\{fill:[^}]+\}/, `.st33{fill:${labelFill};}`);

  // 3. Extract legend circles (station/interchange/interroute icons)
  //    that live earlier in the document — they must be in the scaled group too
  const { svg: svgNoCir, circles: legCircles } = extractLegendCircles(svg);
  svg = svgNoCir;

  // 4. Locate the remaining legend section (line swatches + border rect)
  const lineStart = svg.match(/<line[\s\S]{0,300}?id="line1210"[\s\S]{0,50}?\/>/m);
  const rectEnd   = svg.match(/<rect[\s\S]{0,300}?id="rect1524"[\s\S]{0,50}?\/>/m);

  if (!lineStart || !rectEnd) {
    console.error('Could not find legend markers');
    process.exit(1);
  }

  const startIdx = svg.indexOf(lineStart[0]);
  const endIdx   = svg.indexOf(rectEnd[0]) + rectEnd[0].length;
  const legNonText = svg.slice(startIdx, endIdx);

  // Legend st33 with forced black fill + "(Completed)" tag after Line 6
  const completedTag = `<text x="95" y="495.5" font-family="Arial,sans-serif" font-size="4.5" fill="#231F20">(Completed)</text>`;
  const legText = legendSt33
    .map(p => p.replace(/class="st33"/, 'style="fill:#231F20"'))
    .join('\n') + '\n' + completedTag;

  // 6. Build scaled legend block — circles + swatches + text all in one group
  const newW = LEG.w * LEG_SCALE;
  const newH = LEG.h * LEG_SCALE;
  const px   = LEG.x + LEG_MOVE_X;   // final x position of the legend card
  const tf   = `translate(${px},${LEG.y}) scale(${LEG_SCALE}) translate(${-LEG.x},${-LEG.y})`;

  const scaledBlock =
    `<rect x="${px}" y="${LEG.y}" width="${newW.toFixed(1)}" height="${newH.toFixed(1)}" fill="white"/>\n` +
    `<g transform="${tf}">\n` +
    legCircles.join('\n') + '\n' +
    legNonText + '\n' +
    legText + '\n' +
    `</g>\n` +
    `<rect x="${px}" y="${LEG.y}" width="${newW.toFixed(1)}" height="${newH.toFixed(1)}" ` +
    `rx="3" ry="3" fill="none" stroke="#555" stroke-width="0.8"/>`;

  // 7. Splice scaled legend in place
  svg = svg.slice(0, startIdx) + scaledBlock + svg.slice(endIdx);

  // 8. Append scaled map labels
  const mapLabels = mapSt33.map(scalePath).join('\n');
  return svg.replace('</svg>', `\n${mapLabels}\n</svg>`);
}

function renderSvg(svgStr, outPath) {
  const png = new Resvg(svgStr, {
    fitTo: { mode: 'width', value: TARGET_WIDTH },
    background: 'transparent',
  }).render().asPng();
  fs.writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${Math.round(png.length / 1024)} KB)`);
}

renderSvg(buildOverlaySvg('#231F20'), path.join(assetsDir, 'dhaka-metro-overlay.png'));
renderSvg(buildOverlaySvg('#FFFFFF'), path.join(assetsDir, 'dhaka-metro-overlay-white.png'));
console.log(`Legend at ${Math.round(LEG_SCALE*100)}% of original size.`);
