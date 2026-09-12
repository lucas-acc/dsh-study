const assert = require('node:assert/strict');

function add(a, b) {
  return a - b;
}

assert.equal(add(2, 3), 5);
assert.equal(add(-2, 3), 1);
assert.equal(add(0, 0), 0);
console.log('全部通过');