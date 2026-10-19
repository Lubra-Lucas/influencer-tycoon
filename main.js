import { ITEMS, newState, load, tap, buy, advance, cost, perSecond, perTap, title, fmt, crew } from './game.js';

const SAVE_KEY = 'influencer-tycoon:v1';
const $ = (s) => document.querySelector(s);

let state;
try {
  state = load(localStorage.getItem(SAVE_KEY));
} catch {
  state = newState(); // localStorage bloqueado (aba anonima etc.)
}
// shortcut: ?teste da 1 bi de seguidores para testar a loja, tirar quando o jogo for lancado
if (new URLSearchParams(location.search).has('teste')) {
  state.followers = Math.max(state.followers, 1e9);
  state.total = Math.max(state.total, state.followers);
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento: o jogo continua, so nao lembra
  }
}

// --- pixel art: cada letra e uma cor ---
const PALETTE = {
  h: '#ffd36e', H: '#e0a83c', s: '#f8c9a8', e: '#3a2340', l: '#e8487a',
  d: '#ff7eb6', D: '#c94f92', p: '#2b2b3a', w: '#9ff0ff', k: '#7a2d5a',
};
const SPRITE = [
  '.....hhhhhh.....',
  '....hhhhhhhh....',
  '...hhHhhhhhhh...',
  '...hhsssssshh...',
  '...hhsesseshh...',
  '...hhsssssshh...',
  '...hhssllsshh...',
  '...hhhsssshhh...',
  '...hhh.ss.hhh...',
  '....hddddddh.pp.',
  '...dddddddddswp.',
  '..sdddddddddswp.',
  '..s.dddddddd.pp.',
  '....DddddddD....',
  '...DddddddddD...',
  '..DddddddddddD..',
  '..DDDDDDDDDDDD..',
  '.....ss..ss.....',
  '.....ss..ss.....',
  '....kkk..kkk....',
];
// ajudante 6x10; a = o item na mao. Dois quadros de pernas para andar.
const HELPER = ['.hhhh.', 'hhhhhh', 'hseseh', '.ssss.', '.cccc.', 'scccca', '.cccc.', '.pppp.'];
const LEGS = [['.p..p.', '.k..k.'], ['..pp..', '..kk..']];
const CREW_LOOK = {
  ringlight: { h: '#ffd36e', c: '#fff4fb', a: '#fff4b0' },
  celular: { h: '#3a2340', c: '#ff7eb6', a: '#9ff0ff' },
  estagiaria: { h: '#7a4a2a', c: '#7dffb3', a: '#fff4fb' },
  fofoca: { h: '#e8487a', c: '#c94f92', a: '#ffd36e' },
  bots: { h: '#8a8aa0', s: '#b8c4cc', c: '#5a6a7a', a: '#7dffb3' },
  assessoria: { h: '#2b2b3a', c: '#2b2b3a', a: '#fff4fb' },
  reality: { h: '#ffd36e', c: '#ffd36e', a: '#e8487a' },
  cosmeticos: { h: '#ff7eb6', c: '#ffb3d9', a: '#e8487a' },
};
const BASE_LOOK = { s: '#f8c9a8', e: '#3a2340', p: '#2b2b3a', k: '#7a2d5a' };

// cenario em pixels logicos; o canvas e ampliado so em escala inteira para o pixel ficar nitido
const W = 96, H = 64, FLOOR = 44;
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

function draw(rows, pal, x, y, scale = 1, flip = false) {
  rows.forEach((row, ry) => [...row].forEach((c, rx) => {
    if (!pal[c]) return;
    ctx.fillStyle = pal[c];
    ctx.fillRect(Math.round(x) + (flip ? row.length - 1 - rx : rx) * scale, Math.round(y) + ry * scale, scale, scale);
  }));
}

const room = document.createElement('canvas');
room.width = W;
room.height = H;
{
  const r = room.getContext('2d');
  const box = (c, x, y, w, h) => { r.fillStyle = c; r.fillRect(x, y, w, h); };
  box('#4a2266', 0, 0, W, FLOOR);
  for (let x = 3; x < W; x += 8) box('#52276f', x, 0, 1, FLOOR);
  box('#6b3d7a', 0, FLOOR, W, H - FLOOR);
  for (let y = FLOOR + 4; y < H; y += 5) box('#5a2f68', 0, y, W, 1);
  box('#2a1238', 0, FLOOR - 2, W, 2);
  box('#2a1238', 6, 8, 18, 14); box('#9ff0ff', 7, 9, 16, 12); box('#2a1238', 14, 9, 2, 12); box('#2a1238', 7, 14, 16, 1); // janela
  box('#2a1238', 71, 7, 16, 14); box('#ff7eb6', 72, 8, 14, 12); box('#fff4fb', 74, 10, 2, 2); box('#fff4fb', 82, 10, 2, 2); box('#e8487a', 75, 14, 8, 2); // poster
}

function fit() {
  const dpr = devicePixelRatio || 1;
  const k = Math.max(1, Math.floor(Math.min(stage.clientWidth * dpr / W, stage.clientHeight * dpr / H)));
  canvas.style.width = `${(W * k) / dpr}px`;
  canvas.style.height = `${(H * k) / dpr}px`;
}

// --- ajudantes: so visual; os seguidores ja entram por advance() ---
const walkers = new Map();
let squashUntil = 0;

function scene(t, dt) {
  const live = new Set();
  for (const h of crew(state)) {
    const key = `${h.id}:${h.i}`;
    live.add(key);
    let w = walkers.get(key);
    if (!w) { // contratado agora: entra pela esquerda
      w = { look: { ...BASE_LOOK, ...CREW_LOOK[h.id] }, x: -6, dir: 1, y: 50 + Math.random() * 12, speed: 6 + Math.random() * 8, last: t, next: t + 1 + Math.random() * 2, hop: 0 };
      walkers.set(key, w);
    }
    w.rate = h.rate;
  }
  for (const key of walkers.keys()) if (!live.has(key)) walkers.delete(key);

  for (const w of walkers.values()) {
    if (t > w.hop) w.x += w.dir * w.speed * dt; // para um instante quando coleta
    if (w.x > W - 7) w.dir = -1;
    if (w.x < 1 && w.dir < 0) w.dir = 1;
    if (t >= w.next) {
      const n = w.rate * Math.min(t - w.last, 5); // aba escondida nao vira um "+N" gigante
      w.last = t;
      w.next = t + 2.5 + Math.random() * 1.5;
      w.hop = t + 0.3;
      if (n > 0) popAt(w.x + 3, w.y - 12, `+${fmt(n)}`, 'auto');
    }
  }

  ctx.drawImage(room, 0, 0);
  const star = { y: 60, paint: () => draw(SPRITE, PALETTE, 32, (t < squashUntil ? 22 : 20) + (Math.sin(t * 3) > 0.9 ? -1 : 0), 2) };
  const actors = [...walkers.values()].map((w) => ({ y: w.y, paint: () => {
    const hop = t < w.hop ? -2 : 0;
    const legs = t < w.hop ? LEGS[0] : LEGS[Math.floor(t * 6) % 2];
    draw([...HELPER, ...legs], w.look, w.x, w.y - 10 + hop, 1, w.dir < 0);
  } }));
  for (const a of [...actors, star].sort((a, b) => a.y - b.y)) a.paint();
}

// --- loja ---
const shop = $('#shop');
const rows = {};
for (const [label, key] of [['TOQUE MAIS FORTE', 'tap'], ['RENDA AUTOMATICA', 'auto']]) {
  shop.insertAdjacentHTML('beforeend', `<h2>${label}</h2>`);
  for (const it of ITEMS.filter((i) => i[key])) {
    const b = document.createElement('button');
    b.className = 'item';
    b.innerHTML = `<span>${it.name}</span><span class="count"></span>
      <small>${it.desc} · +${fmt(it[key])}${key === 'auto' ? '/s' : '/toque'}</small><span class="price"></span>`;
    b.onclick = () => { if (buy(state, it.id)) { render(); save(); } };
    shop.append(b);
    rows[it.id] = { b, count: b.querySelector('.count'), price: b.querySelector('.price'), it };
  }
}

// so mexe no DOM quando o valor mudou: render() roda a cada frame
const put = (el, key, v) => { if (el[key] !== v) el[key] = v; };
function render() {
  put($('#followers'), 'textContent', fmt(state.followers));
  put($('#rates'), 'textContent', `${fmt(perSecond(state))}/s · ${fmt(perTap(state))}/toque`);
  put($('#title'), 'textContent', title(state));
  for (const { b, count, price, it } of Object.values(rows)) {
    const c = cost(it, state);
    put(count, 'textContent', String(state.owned[it.id] || ''));
    put(price, 'textContent', fmt(c));
    put(b, 'disabled', state.followers < c);
  }
}

// --- toque (pointerdown: sem atraso no celular e aceita varios dedos) ---
const stage = $('#stage');
new ResizeObserver(fit).observe(stage);

function pop(left, top, text, kind) {
  const el = document.createElement('span');
  el.className = `pop ${kind}`;
  el.textContent = text;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  stage.append(el);
  el.addEventListener('animationend', () => el.remove());
}
// posicao em pixel logico do cenario -> posicao na tela
function popAt(x, y, text, kind) {
  const c = canvas.getBoundingClientRect(), r = stage.getBoundingClientRect();
  pop(c.left - r.left + (x * c.width) / W - 12, c.top - r.top + (y * c.height) / H, text, kind);
}

function post(clientX, clientY) {
  const { n, viral } = tap(state);
  const r = stage.getBoundingClientRect();
  if (clientX === undefined) popAt(48, 18, viral ? `VIRALIZOU! +${fmt(n)}` : `+${fmt(n)}`, viral ? 'viral' : '');
  else pop(clientX - r.left - 20, clientY - r.top - 20, viral ? `VIRALIZOU! +${fmt(n)}` : `+${fmt(n)}`, viral ? 'viral' : '');
  squashUntil = performance.now() / 1000 + 0.08;
  if (navigator.vibrate) navigator.vibrate(viral ? 40 : 8);
  $('#hint').hidden = true;
  render();
}
$('#star').addEventListener('pointerdown', (e) => post(e.clientX, e.clientY));
// teclado: Enter/Espaco com o foco na blogueira, e Espaco em qualquer lugar da pagina
$('#star').addEventListener('click', (e) => { if (e.detail === 0) post(); });
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.target instanceof HTMLButtonElement) return;
  e.preventDefault(); // Espaco nao rola a pagina
  if (!e.repeat) post(); // segurar a tecla nao vira autoclicker
});

function toast(text) {
  $('#toast-text').textContent = text;
  $('#toast').hidden = false;
}
$('#toast button').onclick = () => { $('#toast').hidden = true; };

// --- relogio: o mesmo calculo serve pro frame, pra aba escondida e pro jogo fechado ---
let prev = performance.now() / 1000;
function frame() {
  const t = performance.now() / 1000;
  scene(t, Math.min(t - prev, 0.1));
  prev = t;
  const { seconds, n } = advance(state, Date.now());
  if (seconds > 60 && n >= 1) toast(`Enquanto voce sumia, ganhou ${fmt(n)} seguidores. Nem precisou postar.`);
  render();
  requestAnimationFrame(frame);
}
frame();
setInterval(save, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
