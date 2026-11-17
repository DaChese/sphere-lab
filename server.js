import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

// Only public assets are exposed; repository files and secrets are never served.
const assets = new Map();
for (const [path, file, type] of [
  ['/', 'index.html', 'text/html; charset=utf-8'],
  ['/index.html', 'index.html', 'text/html; charset=utf-8'],
  ['/style.css', 'style.css', 'text/css; charset=utf-8'],
  ['/app.js', 'app.js', 'text/javascript; charset=utf-8'],
]) {
  assets.set(path, { body: await readFile(new URL(`./dist/${file}`, import.meta.url)), type });
}
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');

const server = createServer((req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-cache');
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let path;
  try { path = new URL(req.url, 'http://localhost').pathname; }
  catch { res.writeHead(400); res.end(); return; }
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : 'ok');
    return;
  }
  const asset = assets.get(path);
  if (!asset) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': asset.type, 'Content-Length': asset.body.length });
  res.end(req.method === 'HEAD' ? undefined : asset.body);
});
server.listen(port, '0.0.0.0', () => console.log(`Sphere Lab listening on port ${server.address().port}`));
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
