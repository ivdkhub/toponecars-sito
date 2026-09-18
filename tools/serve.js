#!/usr/bin/env node
// Server statico minimale CON supporto alle richieste Range.
// Obbligatorio: senza Range Chrome non puo' fare seek dentro un <video>, e tutto
// lo scrubbing manuale del currentTime (il fallback quando play() viene respinto)
// smetterebbe di funzionare. `python -m http.server` non implementa Range.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, parse as parseUrl } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PORT = Number(process.env.PORT || 5173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, code, headers, body) {
  res.writeHead(code, headers);
  res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(parseUrl(req.url).pathname);
  } catch {
    return send(res, 400, { 'Content-Type': 'text/plain' }, 'URL non valido');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT)) {
    return send(res, 403, { 'Content-Type': 'text/plain' }, 'Fuori dalla radice');
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' },
        'Non trovato: ' + pathname);
    }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    // I media sono serviti come in produzione (vedi vercel.json): cacheabili e
    // immutabili. Non e' un dettaglio di comodo — il precaricamento riempie la
    // cache del browser con una fetch, e con 'no-cache' quella fetch non
    // risparmierebbe nulla al <video> che chiede lo stesso file poco dopo.
    // L'indirizzo porta gia' una revisione (?v=...), quindi rigenerando i video
    // non si resta con i vecchi in cache.
    const media = pathname.startsWith('/assets/media/');
    const base = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': media ? 'public, max-age=3600' : 'no-cache',
      'Last-Modified': st.mtime.toUTCString(),
    };

    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        let start = m[1] === '' ? null : Number(m[1]);
        let end = m[2] === '' ? null : Number(m[2]);
        if (start === null) {                 // suffisso: bytes=-500
          start = Math.max(0, st.size - (end || 0));
          end = st.size - 1;
        } else if (end === null || end >= st.size) {
          end = st.size - 1;
        }
        if (start > end || start >= st.size) {
          return send(res, 416, { ...base, 'Content-Range': `bytes */${st.size}` }, '');
        }
        res.writeHead(206, {
          ...base,
          'Content-Range': `bytes ${start}-${end}/${st.size}`,
          'Content-Length': end - start + 1,
        });
        return fs.createReadStream(file, { start, end }).pipe(res);
      }
    }

    res.writeHead(200, { ...base, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`TopOneCars su http://localhost:${PORT}/  (radice: ${ROOT})`);
});
