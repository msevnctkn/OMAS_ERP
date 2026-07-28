const fs = require('fs');
const path = require('path');
const src = process.argv[2];
const out = process.argv[3];
let html = fs.readFileSync(src, 'utf8');
const cssDir = path.join(out, 'assets', 'css');
const jsDir = path.join(out, 'assets', 'js');
function safeId(attrs, fallback) {
  const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1] || fallback;
  return id.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) || fallback;
}
let styleCount = 0;
let scriptCount = 0;
html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, code) => {
  styleCount++;
  const name = String(styleCount).padStart(3, '0') + '-' + safeId(attrs, 'style') + '.css';
  fs.writeFileSync(path.join(cssDir, name), code.trim() + '\n', 'utf8');
  const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1];
  return `<link${id ? ` id="${id}"` : ''} rel="stylesheet" href="assets/css/${name}">`;
});
html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, code) => {
  if (/\bsrc\s*=/.test(attrs)) return full;
  scriptCount++;
  const name = String(scriptCount).padStart(3, '0') + '-' + safeId(attrs, 'script') + '.js';
  fs.writeFileSync(path.join(jsDir, name), code.trim() + '\n', 'utf8');
  const id = (attrs.match(/\bid=["']([^"']+)["']/i) || [])[1];
  return `<script${id ? ` id="${id}"` : ''} src="assets/js/${name}"></script>`;
});
fs.writeFileSync(path.join(out, 'index.html'), html, 'utf8');
const manifest = { source: src, createdAt: new Date().toISOString(), styles: styleCount, scripts: scriptCount, index: 'index.html' };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify({ out, styleCount, scriptCount, indexBytes: Buffer.byteLength(html, 'utf8') }, null, 2));
