const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

test('reportError posts a Traceway frame with bearer token and attributes', async () => {
  const got = new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.end();
        srv.close();
        resolve({ auth: req.headers.authorization, path: req.url, body: JSON.parse(body) });
      });
    });
    srv.listen(0, '127.0.0.1', () => {
      process.env.TRACEWAY_DSN = `tok123@http://127.0.0.1:${srv.address().port}/api/report`;
      const { reportError, tracewayOrigin } = require('../lib/report');
      assert.equal(tracewayOrigin, `http://127.0.0.1:${srv.address().port}`);
      reportError(new Error('boom'), { where: 'POST /api/test' });
    });
  });
  const { auth, path, body } = await got;
  assert.equal(auth, 'Bearer tok123');
  assert.equal(path, '/api/report');
  const st = body.collectionFrames[0].stackTraces[0];
  assert.match(st.stackTrace, /^Error: boom/);
  assert.equal(st.isMessage, false);
  assert.equal(st.attributes.where, 'POST /api/test');
});
