import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('production server serves public assets and health on the assigned port', async () => {
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const output = await Promise.race([
      once(child.stdout, 'data').then(([data]) => data.toString()),
      once(child, 'exit').then(([code]) => { throw new Error(`Server exited: ${code}`); }),
      new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Startup timeout')), 5000); timer.unref(); }),
    ]);
    const port = output.match(/port (\d+)/)?.[1];
    assert.ok(port);
    const base = `http://127.0.0.1:${port}`;
    for (const [path, type, text] of [['/', 'text/html', 'The Worlds Within'], ['/app.js', 'text/javascript', 'function membrane'], ['/style.css', 'text/css', '--paper'], ['/health', 'text/plain', 'ok']]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.ok(response.headers.get('content-type').startsWith(type));
      assert.ok((await response.text()).includes(text));
    }
    assert.equal((await fetch(base + '/?preview=1')).status, 200);
    const head = await fetch(base + '/app.js', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    for (const path of ['/missing', '/server.js', '/.git/config', '/.env', '/%2e%2e/README.md']) assert.equal((await fetch(base + path)).status, 404);
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  } finally {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
  }
});
