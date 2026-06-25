/**
 * Compile targets.mind from PNG (Node.js, uses mind-ar OfflineCompiler).
 * Run: node scripts/compile-mind.js
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// mind-ar is ESM — dynamic import
async function main() {
  const pngPath = path.join(__dirname, '../assets/ar-card.png');
  const outPath = path.join(__dirname, '../targets.mind');

  console.log('Loading image…');
  const img = await loadImage(pngPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // OfflineCompiler expects HTMLImage-like object with width/height
  const imageLike = { width: img.width, height: img.height, ...img };

  console.log(`Compiling ${img.width}×${img.height} (this takes ~1–2 min)…`);
  const compilerPath = path.join(__dirname, '../node_modules/mind-ar/src/image-target/offline-compiler.js');
  const { OfflineCompiler } = await import(require('url').pathToFileURL(compilerPath).href);
  const compiler = new OfflineCompiler();
  await compiler.compileImageTargets([imageLike], (p) => {
    process.stdout.write(`\rProgress: ${Math.round(p)}%`);
  });
  const buffer = compiler.exportData();
  fs.writeFileSync(outPath, Buffer.from(buffer));
  console.log(`\nWrote ${outPath} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
