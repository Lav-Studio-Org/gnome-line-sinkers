// Builds the ZIP that goes to the YouTube Playables Developer Portal, and checks it against the
// publishing rules (developers.google.com/youtube/gaming/playables/certification/requirements).
// Usage: node scripts/bundle-playables.js [out-dir]   (default: dist/)
//
// The bundle is exactly the tree the website serves: index.html, style.css, the manifest,
// version.json, js/, img/ and fonts/. No build step and no dependencies: this writes the ZIP itself
// so it works on any machine with node. Exits 1 if a MUST is broken, 0 with warnings if only a
// SHOULD is.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
const ZIP = path.join(OUT, 'playables.zip');
const FILES = ['index.html', 'style.css', 'manifest.webmanifest', 'version.json'];
const DIRS = ['js', 'img', 'fonts'];
const SDK_URL = 'https://www.youtube.com/game_api/v1';

// platform limits; `must` fails the build, `should` only warns
const LIM = {
  initialMust: 30 * 1024 * 1024, initialShould: 15 * 1024 * 1024,
  totalMust: 250 * 1024 * 1024,
  fileMust: 30 * 1024 * 1024, fileShould: 512 * 1024,
  filesMax: 8000,
};

const problems = [];
const warnings = [];
const must = (ok, msg) => { if (!ok) problems.push(msg); return ok; };
const should = (ok, msg) => { if (!ok) warnings.push(msg); return ok; };
const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;

// ---------- collect the runtime tree ----------
function walk(rel, out) {
  const abs = path.join(ROOT, rel);
  if (fs.statSync(abs).isDirectory()) {
    for (const name of fs.readdirSync(abs).sort()) walk(`${rel}/${name}`, out);
  } else out.push({ rel, abs });
  return out;
}
const files = [].concat(
  FILES.map((rel) => ({ rel, abs: path.join(ROOT, rel) })),
  DIRS.map((dir) => walk(dir, []))
).reduce((all, one) => all.concat(one), []).sort((a, b) => (a.rel < b.rel ? -1 : 1));

// ---------- checks that need the file content ----------
const text = (rel) => (files.find((f) => f.rel === rel) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : '');
const html = text('index.html');
const js = files.filter((f) => f.rel.endsWith('.js')).map((f) => ({ rel: f.rel, src: fs.readFileSync(f.abs, 'utf8') }));

// 1. the SDK has to be the first script, before any game code
const sdkAt = html.indexOf(`<script src="${SDK_URL}"></script>`);
const firstGame = html.indexOf('<script src="js/');
must(sdkAt > -1, `index.html must load the Playables SDK (${SDK_URL})`);
must(sdkAt > -1 && firstGame > -1 && sdkAt < firstGame, 'the SDK script must come before every js/ script');

// 2. every reference in index.html stays inside the bundle
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('#'));
for (const ref of refs) {
  if (ref === SDK_URL) continue;
  must(!/^[a-z]+:|^\/\//i.test(ref), `index.html must not reference ${ref} (relative paths only)`);
  must(!ref.startsWith('/'), `index.html must not use the absolute path ${ref}`);
}

// 3. no off-platform calls: the only network the game may reach is the SDK
for (const f of js) {
  must(!/\bXMLHttpRequest\b|\bWebSocket\b|sendBeacon|new Worker\b|importScripts/.test(f.src), `${f.rel}: off-platform network API`);
  const fetches = [...f.src.matchAll(/fetch\(\s*['"`]?(https?:)?\/\//g)].map((m) => m[0]);
  must(!fetches.length, `${f.rel}: fetch() to an external URL`);
  must(!/\beval\s*\(|new Function\s*\(|WebAssembly|new Worker\b/.test(f.src), `${f.rel}: eval/WASM/worker (may be rejected)`);
}
// the global counter is the one place that used to call out: it must be switched off in Playables
const global = js.find((f) => f.rel.endsWith('js/global.js'));
must(!global || /inPlayables/.test(global.src), 'js/global.js must stay off inside Playables');

// 4. progress goes through the cloud save there, and the Page Visibility API is out
const main = js.find((f) => f.rel.endsWith('js/main.js'));
must(!main || /P\.save\(/.test(main.src), 'js/main.js must write progress through KL.Platform');
must(!main || /!P\.inPlayables\)[^;]*visibilitychange/.test(main.src), 'js/main.js may not use the Page Visibility API inside Playables');
const audio = js.find((f) => f.rel.endsWith('js/audio.js'));
must(!audio || /!KL\.Platform\.inPlayables\)[^;]*visibilitychange/.test(audio.src), 'js/audio.js may not use the Page Visibility API inside Playables');

// 5. sizes, names, count
let total = 0;
let initial = 0;
let biggest = { rel: '', size: 0 };
for (const f of files) {
  const size = fs.statSync(f.abs).size;
  total += size;
  if (f.rel !== 'version.json') initial += size; // everything the first load pulls in
  if (size > biggest.size) biggest = { rel: f.rel, size };
  must(size < LIM.fileMust, `${f.rel}: ${kb(size)} is over the 30 MiB per-file limit`);
  should(size < LIM.fileShould, `${f.rel}: ${kb(size)} is over the 512 KiB per-file target`);
  for (const part of f.rel.split('/')) must(/^[A-Za-z0-9._-]+$/.test(part), `${f.rel}: file names may only use a-z A-Z 0-9 _ - .`);
}
must(initial < LIM.initialMust, `initial bundle ${kb(initial)} is over the 30 MiB limit`);
should(initial < LIM.initialShould, `initial bundle ${kb(initial)} is over the 15 MiB target`);
must(total < LIM.totalMust, `total bundle ${kb(total)} is over the 250 MiB limit`);
must(files.length <= LIM.filesMax, `${files.length} files is over the ${LIM.filesMax} file limit`);

// ---------- zip it (deflate, store nothing else) ----------
const CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();
const dosTime = (d) => ({
  time: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
  date: ((((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
});

const parts = [];
const central = [];
let offset = 0;
for (const f of files) {
  const raw = fs.readFileSync(f.abs);
  const body = zlib.deflateRawSync(raw, { level: 9 });
  const name = Buffer.from(f.rel, 'utf8');
  const { time, date } = dosTime(fs.statSync(f.abs).mtime);
  const crc = CRC(raw);
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4);
  head.writeUInt16LE(0x0800, 6); // UTF-8 names
  head.writeUInt16LE(8, 8); // deflate
  head.writeUInt16LE(time, 10);
  head.writeUInt16LE(date, 12);
  head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(body.length, 18);
  head.writeUInt32LE(raw.length, 22);
  head.writeUInt16LE(name.length, 26);
  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50, 0);
  dir.writeUInt16LE(20, 4);
  dir.writeUInt16LE(20, 6);
  dir.writeUInt16LE(0x0800, 8);
  dir.writeUInt16LE(8, 10);
  dir.writeUInt16LE(time, 12);
  dir.writeUInt16LE(date, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(body.length, 20);
  dir.writeUInt32LE(raw.length, 24);
  dir.writeUInt16LE(name.length, 28);
  dir.writeUInt32LE(offset, 42);
  parts.push(head, name, body);
  central.push(dir, name);
  offset += head.length + name.length + body.length;
}
const cd = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cd.length, 12);
eocd.writeUInt32LE(offset, 16);
const zip = Buffer.concat(parts.concat([cd, eocd]));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(ZIP, zip);

// ---------- report ----------
const packed = zlib.deflateRawSync(Buffer.concat(files.map((f) => fs.readFileSync(f.abs))), { level: 9 }).length;
console.log(`files        ${files.length}  (limit ${LIM.filesMax})`);
console.log(`initial      ${kb(initial)} raw, ~${kb(packed)} deflated  (must < 30 MiB, target < 15 MiB)`);
console.log(`total        ${kb(total)} raw  (must < 250 MiB)`);
console.log(`biggest      ${biggest.rel} ${kb(biggest.size)}  (must < 30 MiB, target < 512 KiB)`);
console.log(`zip          ${ZIP}  ${kb(zip.length)}`);
for (const w of warnings) console.log(`warn         ${w}`);
for (const p of problems) console.error(`FAIL         ${p}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s): do not upload this bundle.`);
  process.exit(1);
}
console.log(`\nOK: ${path.relative(ROOT, ZIP)} is ready for the Playables Developer Portal.`);
