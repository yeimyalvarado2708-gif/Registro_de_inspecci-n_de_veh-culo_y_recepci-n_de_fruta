// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearLocalStorageMemoria } from './localStorageMemoria.js';

test('guarda, lee, recorre y elimina claves', () => {
  const ls = crearLocalStorageMemoria();
  ls.setItem('a', '1');
  ls.setItem('b', '2');
  assert.equal(ls.length, 2);
  assert.equal(ls.getItem('a'), '1');
  assert.equal(ls.getItem('x'), null);
  assert.deepEqual([ls.key(0), ls.key(1), ls.key(2)], ['a', 'b', null]);
  ls.removeItem('a');
  assert.equal(ls.getItem('a'), null);
  ls.clear();
  assert.equal(ls.length, 0);
});

test('lanza QuotaExceededError al superar el límite y no escribe', () => {
  const ls = crearLocalStorageMemoria({ limiteBytes: 20 });
  ls.setItem('a', '1234');
  assert.throws(() => ls.setItem('b', 'xxxxxxxxxx'), (e) => e instanceof DOMException && e.name === 'QuotaExceededError');
  assert.equal(ls.getItem('b'), null);
  assert.deepEqual(ls.instantanea(), { a: '1234' });
});

test('modo no disponible lanza en cualquier acceso', () => {
  const ls = crearLocalStorageMemoria({ noDisponible: true });
  assert.throws(() => ls.getItem('a'));
  assert.throws(() => ls.setItem('a', '1'));
  assert.throws(() => ls.length);
  ls.fijarNoDisponible(false);
  ls.setItem('a', '1');
  assert.equal(ls.getItem('a'), '1');
});
