import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newState, tap, buy, advance, load, fmt, perSecond, cost, crew, home, nextHome, HOMES, ITEMS, OFFLINE_CAP_S } from './game.js';

test('toque, viral e compra', () => {
  const s = newState(0);
  assert.equal(tap(s, () => 0.99).n, 1);
  assert.equal(tap(s, () => 0).n, 10); // viralizou
  assert.equal(buy(s, 'ringlight'), false); // 11 < 15
  s.followers = 15;
  assert.equal(buy(s, 'ringlight'), true);
  assert.equal(s.followers, 0);
  assert.equal(cost(ITEMS.find((i) => i.id === 'ringlight'), s), 18); // 15 * 1.15, arredondado pra cima
  assert.equal(buy(s, 'nao-existe'), false);
});

test('tempo offline rende ate o teto', () => {
  const s = newState(0);
  s.owned.celular = 2; // 2/s
  assert.equal(advance(s, 10_000).n, 20);
  const { seconds } = advance(s, 10_000 + 999 * 3600 * 1000);
  assert.equal(seconds, OFFLINE_CAP_S);
  assert.equal(advance(s, 0).n, 0); // relogio voltou: nao ganha nem perde
});

test('save adulterado nao quebra o jogo', () => {
  assert.equal(load('lixo', 5).followers, 0);
  const s = load(JSON.stringify({ followers: -5, total: 'x', owned: { celular: 3.7, bots: -1, hack: 99 }, last: 9e15 }), 100);
  assert.equal(s.followers, 0);
  assert.equal(s.owned.celular, 3);
  assert.equal(s.owned.bots, 0);
  assert.equal(s.owned.hack, undefined);
  assert.equal(s.last, 100); // last no futuro e ignorado
  assert.equal(perSecond(s), 3);
});

test('numeros grandes', () => {
  assert.equal(fmt(0.1), '0,1');
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1500), '1,5 mil');
  assert.equal(fmt(999_999), '999,9 mil');
  assert.equal(fmt(2.3e9), '2,3 bi');
});

test('ajudantes dividem a renda do item sem inventar seguidor', () => {
  const s = newState(0);
  assert.deepEqual(crew(s), []);
  s.owned = { celular: 5, ringlight: 1, unha: 3 }; // unha e de toque: nao anda
  const c = crew(s);
  assert.deepEqual(c.map((h) => h.id), ['ringlight', 'celular', 'celular']);
  assert.equal(c[1].rate, 2.5);
  assert.ok(Math.abs(c.reduce((t, h) => t + h.rate, 0) - perSecond(s)) < 1e-9);
});

test('casa muda pelo total e a mansao nao tem proxima', () => {
  const at = (total) => ({ ...newState(0), total });
  assert.equal(home(at(0)), 0);
  assert.equal(home(at(29999)), 0);
  assert.equal(home(at(30000)), 1);
  assert.equal(home(at(3e8)), HOMES.length - 1);
  assert.deepEqual(nextHome(at(0)), { name: 'Kitnet', min: 30000 });
  assert.equal(nextHome(at(3e8)), null);
});
