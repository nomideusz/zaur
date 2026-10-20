const assert = require('node:assert/strict');
const test = require('node:test');

const { countIn } = require('../lib/pwned');

test('countIn finds the suffix line and ignores padding', () => {
  const body = '0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:0\r\n';
  assert.equal(countIn(body, '1E4C9B93F3F0682250B6CF8331B7EE68FD8'), 3861493);
  assert.equal(countIn(body, '00D4F6E8FA6EECAD2A3AA415EEC418D38EC'), 0);
  assert.equal(countIn(body, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), 0);
});
