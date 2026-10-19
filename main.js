import { ITEMS, newState, load, tap, buy, advance, cost, perSecond, perTap, title, fmt, crew, HOMES, home, nextHome } from './game.js';

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

// --- pixel art de codigo: cada letra e uma cor ---
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

// as areas sem arte do PixelLab: desenhadas em codigo, em escala 2
const PROP_PAL = {
  g: '#2b2b3a', w: '#9ff0ff', t: '#5a4a6a', c: '#7a4a2a', m: '#a8744a', M: '#6a4228', n: '#c9c9d9', b: '#7dffb3',
  f: '#fff4fb', r: '#e8487a', o: '#000000', d: '#ff7eb6', D: '#c94f92', Y: '#ffd36e', s: '#f8c9a8', k: '#3a2340',
};
const PROPS = {
  celular: [
    '........dddddddddddddddd', '........dddddddddddddddd', '..gggg..dddfdddddddYdddd', '.gwwwwg.ddfffdddddddddYd',
    '.gwwwwg.dddfdddddddddddd', '.gwwwwg.dddddddddddddddd', '.gwwwwg.dddddddddddddddd', '.gwwwwg.dddddddddddddddd',
    '.gggggg.dddddddddddddddd', '...tt...dddddddddddddddd', '...tt...DDDDDDDDDDDDDDDD', '..t..t..................',
    '.t....t.................', 'tt....tt................',
  ],
  estagiaria: [
    '.........cccccc.........', '.........skssks.........', '.........ssssss.........', '.ffff...bbbbbbbb....n...',
    '.fnnf...bbbbbbbb...cccc.', '.ffff...bbbbbbbb...cccc.', 'mmmmmmmmmmmmmmmmmmmmmmmm', 'MMMMMMMMMMMMMMMMMMMMMMMM',
    'M......................M', 'M......................M', 'M......................M',
  ],
  fofoca: [
    '.fffffff.......fffffff..', '.fo.o.of.......fo.o.of..', '.fffffff.......fffffff..', '...f.............f......',
    '........gggggggg........', '........gbbbbbbg........', '........gbbbbbbg........', '......nnnnnnnnnnnn......',
    'mmmmmmmmmmmmmmmmmmmmmmmm', 'MMMMMMMMMMMMMMMMMMMMMMMM', 'M......................M', 'M......................M',
  ],
  assessoria: [
    '.........gggggg.........', '.........gggggg.........', '.........gggggg.........', '.fff.....gggggg.YYYYYY..',
    '.fff.....gggggg.YrrrrY..', '.fff.....gggggg.YYYYYY..', 'mmmmmmmmmmmmmmmmmmmmmmmm', 'MMMMMMMMMMMMMMMMMMMMMMMM',
    'M......................M', 'M......................M', 'M......................M',
  ],
  reality: [
    '.ofofofofof.............', '.oooooooooo....gggg.....', '.ofrfrfrfoo...ggYYgg....', '.offfffffoo....gYYg.....',
    '.oooooooooo.....g.......', '................g.......', '.dddddddddddd...g.......', '.dddddddddddd.gggggg....',
  ],
};
const SIGN = ['ooooooooo', 'offfrffoo', 'offrrrfoo', 'ofrfrffoo', 'offrrrfoo', 'offfrrfoo', 'ofrrrffoo', 'offfrffoo', 'ooooooooo'];

// mapa visto de cima em pixels logicos; o canvas e ampliado so em escala inteira para o pixel ficar nitido
const W = 192, H = 160;
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

const box = (c, x, y, w, h, g = ctx) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function draw(rows, pal, x, y, scale = 1, flip = false) {
  rows.forEach((row, ry) => [...row].forEach((c, rx) => {
    if (pal[c]) box(pal[c], Math.round(x) + (flip ? row.length - 1 - rx : rx) * scale, Math.round(y) + ry * scale, scale, scale);
  }));
}

// imagens do PixelLab: se o arquivo faltar, o mapa continua inteiro
const img = (name) => Object.assign(new Image(), { src: `art/${name}.png` });
const ready = (im) => im?.complete && im.naturalWidth;
const CASA = [0, 1, 2, 3, 4].map((i) => img(`casa-${i}`));
const GIRL = img('blogueira'), GIRL_POS = [72, 64], GIRL_FEET = 101;
const ART = { ringlight: img('estudio'), bots: img('bots'), cosmeticos: img('cosmeticos') };

// 8 lotes na ordem de ITEMS: 3 a esquerda, 3 a direita, 2 embaixo. A rota (pes do ajudante) vai do lote
// ate a blogueira em L pelo caminho de terra: tronco vertical rente a casa, depois horizontal.
const LOT = { w: 56, h: 38 };
const SLOTS = [[4, 1], [4, 40], [4, 79], [132, 1], [132, 40], [132, 79], [36, 119], [100, 119]];
const AREAS = ITEMS.filter((it) => it.auto).map((it, i) => {
  const [x, y] = SLOTS[i], cx = x + LOT.w / 2, fy = y + LOT.h - 4, left = cx < 96;
  const route = y > 100 ? [[cx, fy], [cx, 110], [left ? 86 : 106, 110]]
    : [[cx, fy], [left ? 60 : 132, fy], [left ? 60 : 132, 102], [left ? 74 : 118, 102]];
  const len = route.slice(1).reduce((s, [bx, by], k) => s + Math.abs(bx - route[k][0]) + Math.abs(by - route[k][1]), 0);
  return { id: it.id, x, y, route, len };
});

// ponto (pes) e sentido horizontal a `d` px do comeco da rota
function along({ route, len }, d) {
  for (let i = 1; i < route.length; i++) {
    const [ax, ay] = route[i - 1], [bx, by] = route[i], seg = Math.abs(bx - ax) + Math.abs(by - ay);
    if (d <= seg || i === route.length - 1) {
      const k = Math.min(d / seg, 1);
      return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.sign(bx - ax)];
    }
    d -= seg;
  }
}

// chao pintado uma vez: grama com tufinhos (sorteio fixo, igual em todo aparelho) e caminhos de terra
const ground = document.createElement('canvas');
ground.width = W;
ground.height = H;
(function paintGround() {
  const g = ground.getContext('2d');
  let seed = 7;
  const rnd = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor((seed / 2 ** 32) * n); };
  box('#4f9a4a', 0, 0, W, H, g);
  for (let k = 0; k < 260; k++) {
    const x = rnd(W - 3), y = rnd(H - 3), kind = rnd(8);
    if (kind < 3) { box('#3f8a3c', x, y + 1, 1, 1, g); box('#3f8a3c', x + 2, y + 1, 1, 1, g); box('#3f8a3c', x + 1, y, 1, 1, g); }
    else if (kind < 6) { box('#6ab85a', x, y, 1, 2, g); box('#6ab85a', x + 2, y + 1, 1, 1, g); }
    else { box(['#ff7eb6', '#ffd36e', '#fff4fb'][kind - 6], x, y, 1, 1, g); }
  }
  const strips = [[96, 64, 96, 100], ...AREAS.flatMap((a) => a.route.slice(1).map(([bx, by], k) => [...a.route[k], bx, by]))];
  for (const [color, pad] of [['#a8804f', 4], ['#c9a06a', 3]]) {
    for (const [ax, ay, bx, by] of strips) {
      box(color, Math.min(ax, bx) - pad, Math.min(ay, by) - pad - 2, Math.abs(bx - ax) + pad * 2, Math.abs(by - ay) + pad * 2, g);
    }
  }
  for (let k = 0; k < 60; k++) box('#a8804f', 50 + rnd(100), 60 + rnd(100), 1, 1, g);
})();

// lote ainda nao comprado: terra escura, cerquinha tracejada e plaquinha
function lockedLot({ x, y }) {
  box('#5e4430', x, y, LOT.w, LOT.h);
  box('#7a5a3a', x + 2, y + 2, LOT.w - 4, LOT.h - 4);
  for (let d = 0; d < LOT.w; d += 6) { box('#e0c08a', x + d, y, 3, 2); box('#e0c08a', x + d, y + LOT.h - 2, 3, 2); }
  for (let d = 0; d < LOT.h; d += 6) { box('#e0c08a', x, y + d, 2, 3); box('#e0c08a', x + LOT.w - 2, y + d, 2, 3); }
  box('#3a2418', x + LOT.w / 2 - 1, y + 20, 2, 10);
  draw(SIGN, { o: '#3a2418', f: '#fff4fb', r: '#e8487a' }, x + LOT.w / 2 - 4, y + 11);
}

function lot(a) {
  if (!state.owned[a.id]) return lockedLot(a);
  const art = ART[a.id];
  if (ready(art)) return ctx.drawImage(art, a.x - 4, Math.min(a.y - 1, H - 48));
  box('#b08a5c', a.x, a.y, LOT.w, LOT.h);
  const rows = PROPS[a.id];
  if (rows) draw(rows, PROP_PAL, a.x + (LOT.w - 48) / 2, a.y + LOT.h - 2 - rows.length * 2, 2);
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
const TRIP_MAX = 20; // aba escondida nao vira um "+N" gigante

function scene(t, dt) {
  const live = new Set();
  for (const h of crew(state)) {
    const key = `${h.id}:${h.i}`;
    live.add(key);
    let w = walkers.get(key);
    if (!w) { // contratado agora: sai da area do proprio item
      w = { a: AREAS.find((a) => a.id === h.id), look: { ...BASE_LOOK, ...CREW_LOOK[h.id] }, d: 0, dir: 1, face: 1, speed: 14 + Math.random() * 8, last: t, rest: t + Math.random() * 3, hop: 0 };
      walkers.set(key, w);
    }
    w.rate = h.rate;
  }
  for (const key of walkers.keys()) if (!live.has(key)) walkers.delete(key);

  for (const w of walkers.values()) {
    if (t >= w.rest && t > w.hop) w.d += w.dir * w.speed * dt; // para um instante quando chega
    if (w.dir > 0 && w.d >= w.a.len) {
      w.d = w.a.len;
      w.dir = -1;
      w.hop = t + 0.3;
      const n = w.rate * Math.min(t - w.last, TRIP_MAX); // renda da viagem inteira, ida e volta
      w.last = t;
      const [x, y] = along(w.a, w.d);
      if (n > 0) popAt(x, y - 24, `+${fmt(n)}`, 'auto');
    } else if (w.dir < 0 && w.d <= 0) {
      w.d = 0;
      w.dir = 1;
      w.rest = t + 1 + Math.random() * 2;
    }
  }

  ctx.drawImage(ground, 0, 0);
  AREAS.forEach(lot);
  if (ready(CASA[homeIdx])) ctx.drawImage(CASA[homeIdx], 64, 2);
  const star = { y: GIRL_FEET, paint: () => ready(GIRL) && ctx.drawImage(GIRL, GIRL_POS[0], GIRL_POS[1] + (t < squashUntil ? 2 : Math.sin(t * 3) > 0.9 ? -1 : 0)) };
  const actors = [...walkers.values()].map((w) => {
    const [x, y, dx] = along(w.a, w.d);
    if (dx) w.face = dx * w.dir;
    return { y, paint: () => {
      const hop = t < w.hop ? -3 : 0;
      const legs = t < w.hop || t < w.rest ? LEGS[0] : LEGS[Math.floor(t * 6) % 2];
      draw([...HELPER, ...legs], w.look, x - 6, y - 20 + hop, 2, w.face < 0);
    } };
  });
  for (const a of [...actors, star].sort((a, b) => a.y - b.y)) a.paint();
  if (!state.owned.ringlight) box('rgba(0,0,0,.45)', 0, 0, W, H); // noite ate comprar o ring light
}

const HOME_TOAST = [
  '',
  'Mudou pra Kitnet! O aluguel e caro mas a luz natural engaja.',
  'Apartamento! Agora o fundo do story tem predio e voce tem boleto.',
  'Cobertura! A vista e linda, o condominio e um assalto.',
  'Mansao! Tem lustre dourado e zero privacidade, igual sua vida.',
];

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
let homeIdx = home(state);
const goal = $('#goal');
function render() {
  const h = home(state);
  if (h !== homeIdx) {
    homeIdx = h;
    toast(HOME_TOAST[h]);
  }
  const next = nextHome(state);
  put(goal, 'hidden', !next);
  if (next) {
    put(goal.firstChild, 'textContent', `${next.name}: faltam ${fmt(next.min - state.total)}`);
    put(goal.lastChild.style, 'width', `${Math.min(100, ((state.total - HOMES[h][0]) / (next.min - HOMES[h][0])) * 100).toFixed(1)}%`);
  }
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
  if (clientX === undefined) popAt(96, 58, viral ? `VIRALIZOU! +${fmt(n)}` : `+${fmt(n)}`, viral ? 'viral' : '');
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
  const el = $('#toast-text'); // dois avisos no mesmo frame (offline + mudanca): junta em vez de apagar
  el.textContent = $('#toast').hidden ? text : `${el.textContent} ${text}`;
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
