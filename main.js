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
const HOME_LOOK = [
  { wall: '#4a2266', stripe: '#52276f', floor: '#6b3d7a', plank: '#5a2f68',
    detail: (box) => {
      box('#2a1238', 8, 10, 12, 10); box('#9ff0ff', 9, 11, 10, 8); box('#2a1238', 13, 11, 2, 8); // janelinha
      for (let k = 0; k < 14; k++) box('#ff7eb6', 72 + k, 8 + Math.floor(k / 5), 1, 12); // poster torto
      box('#fff4fb', 75, 12, 2, 2); box('#fff4fb', 81, 13, 2, 2); box('#e8487a', 76, 17, 6, 1);
      box('#3a1a52', 50, 11, 5, 4); box('#3a1a52', 52, 15, 3, 1); // mancha de umidade
    } },
  { wall: '#6a3a8a', stripe: '#73449a', floor: '#8a5a6a', plank: '#744a5a', toast: 'Mudou pra Kitnet! O aluguel e caro mas a luz natural engaja.',
    detail: (box) => {
      box('#2a1238', 6, 6, 20, 16); box('#9ff0ff', 7, 7, 18, 14); box('#2a1238', 15, 7, 2, 14); box('#2a1238', 7, 13, 18, 1); // janela maior
      box('#ff7eb6', 7, 7, 4, 14); box('#c94f92', 10, 7, 1, 14); box('#ff7eb6', 21, 7, 4, 14); box('#c94f92', 21, 7, 1, 14); // cortina
      box('#2a1238', 74, 10, 12, 9); box('#ffd36e', 75, 11, 10, 7); box('#e8487a', 78, 13, 4, 3); // quadrinho
    } },
  { wall: '#3d4f86', stripe: '#465a94', floor: '#a87a5a', plank: '#8d6347', toast: 'Apartamento! Agora o fundo do story tem predio e voce tem boleto.',
    detail: (box) => {
      box('#2a1238', 4, 4, 24, 20); box('#7fd0f0', 5, 5, 22, 18); // janela grande com predios
      box('#2b3a66', 6, 14, 5, 9); box('#2b3a66', 12, 10, 6, 13); box('#2b3a66', 19, 15, 7, 8);
      for (const [x, y] of [[7, 16], [9, 19], [14, 12], [16, 16], [14, 20], [21, 17], [24, 20]]) box('#ffd36e', x, y, 1, 2);
      box('#2a1238', 14, 5, 1, 18);
      box('#2a1238', 70, 8, 16, 12); box('#fff4fb', 71, 9, 14, 10); box('#ff7eb6', 75, 11, 6, 6); box('#e8487a', 77, 13, 2, 2); // quadro
    } },
  { wall: '#1e2a4a', stripe: '#243256', floor: '#3a3a4e', plank: '#2c2c3e', toast: 'Cobertura! A vista e linda, o condominio e um assalto.',
    detail: (box) => {
      for (const [x, y, w, h] of [[4, 4, 24, 20], [68, 4, 24, 16]]) { // vidro com ceu
        box('#c8d8ff', x - 1, y - 1, w + 2, h + 2); box('#10183a', x, y, w, h);
        for (const [dx, dy] of [[3, 3], [9, 8], [15, 4], [19, 12], [6, 14], [12, 17]]) if (dx < w && dy < h) box('#fff4fb', x + dx, y + dy, 1, 1);
      }
      box('#fff4b0', 20, 7, 4, 4); box('#10183a', 22, 6, 3, 3); // lua
      box('#fff4b0', 83, 8, 4, 4); box('#10183a', 85, 7, 3, 3);
    } },
  { wall: '#7a2d3a', stripe: '#8a3646', floor: '#d9c7a0', plank: '#b8a47c', toast: 'Mansao! Tem lustre dourado e zero privacidade, igual sua vida.',
    detail: (box) => {
      box('#ffd36e', 47, 0, 2, 4); box('#ffd36e', 40, 4, 16, 2); // lustre
      for (const x of [40, 45, 50, 55]) box('#fff4b0', x, 1, 1, 3);
      for (const [x, w] of [[42, 1], [47, 2], [53, 1]]) box('#fff4b0', x, 6, w, 2);
      box('#ffd36e', 6, 6, 18, 18); box('#9ff0ff', 8, 8, 14, 14); box('#ffd36e', 14, 8, 2, 14); // janela com cortina dourada
      box('#c94f92', 8, 8, 3, 14); box('#c94f92', 19, 8, 3, 14);
      box('#ffd36e', 69, 5, 20, 17); box('#2a1238', 71, 7, 16, 13); box('#f8c9a8', 77, 10, 4, 5); box('#ffd36e', 76, 9, 6, 2); box('#e8487a', 76, 16, 6, 3); // quadro com moldura
    } },
];

function paintRoom(i) {
  const L = HOME_LOOK[i], r = room.getContext('2d');
  const box = (c, x, y, w, h) => { r.fillStyle = c; r.fillRect(x, y, w, h); };
  box(L.wall, 0, 0, W, FLOOR);
  for (let x = 3; x < W; x += 8) box(L.stripe, x, 0, 1, FLOOR);
  box(L.floor, 0, FLOOR, W, H - FLOOR);
  for (let y = FLOOR + 4; y < H; y += 5) box(L.plank, 0, y, W, 1);
  box('#2a1238', 0, FLOOR - 2, W, 2);
  L.detail(box);
}

// objetos de renda automatica no cenario: posicao fixa, nunca em x 32..64 (a blogueira)
const OBJ_PAL = {
  y: '#fff4b0', t: '#5a4a6a', g: '#2b2b3a', w: '#9ff0ff', c: '#7a4a2a', m: '#a8744a', M: '#6a4228',
  n: '#c9c9d9', b: '#7dffb3', f: '#fff4fb', r: '#e8487a', o: '#000000', d: '#ff7eb6', D: '#c94f92', Y: '#ffd36e',
};
const stack = (rows, k) => Array.from({ length: k }, () => rows).flat();
const PROPS = {
  ringlight: () => draw(['.yyyyy.', 'y.....y', 'y.....y', 'y.....y', 'y.....y', '.yyyyy.', '...t...', '...t...', '..ttt..'], OBJ_PAL, 23, 37),
  celular: () => draw(['.ggg.', 'gwwwg', 'gwwwg', 'gwwwg', '.ggg.', '..t..', '..t..', '.ttt.'], OBJ_PAL, 67, 38),
  estagiaria: () => draw(['..fcf.....', '..fff.....', 'mmmmmmmmmm', 'M........M', 'M........M', 'M........M'], OBJ_PAL, 76, 39),
  fofoca: () => {
    draw(['.gggggg...', '.gbbbbg...', '.gbbbbg...', 'nnnnnnnn..', 'mmmmmmmmmm', 'M........M', 'M........M', 'M........M'], OBJ_PAL, 10, 38);
    draw(['fffffff', 'fo.o.of', 'fffffff', '..f....'], OBJ_PAL, 14, 31);
  },
  bots: (n) => draw(stack(['ggggg', 'gbbbg', 'ggggg'], Math.min(n, 5)), OBJ_PAL, 89, 46 - 3 * Math.min(n, 5)),
  assessoria: () => draw(['YY..YY', 'YYYYYY', '.YrrY.', '.YrrY.', '.YYYY.'], OBJ_PAL, 89, 23),
  reality: () => draw(['ofofofofof', 'oooooooooo', 'offfffffoo', 'offfffffoo', 'oooooooooo'], OBJ_PAL, 58, 9),
  cosmeticos: (n) => draw(stack(['dddddd', 'dffffd', 'DDDDDD'], Math.min(n, 5)), OBJ_PAL, 1, 46 - 3 * Math.min(n, 5)),
};

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
      w = { look: { ...BASE_LOOK, ...CREW_LOOK[h.id] }, x: -6, dir: 1, y: 47 + Math.random() * 11, speed: 6 + Math.random() * 8, last: t, next: t + 1 + Math.random() * 2, hop: 0 };
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
  for (const [id, paint] of Object.entries(PROPS)) if (state.owned[id]) paint(state.owned[id]);
  if (!state.owned.ringlight) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); } // quarto escuro ate comprar o ring light
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
let homeIdx = home(state);
paintRoom(homeIdx);
const goal = $('#goal');
function render() {
  const h = home(state);
  if (h !== homeIdx) {
    homeIdx = h;
    paintRoom(h);
    toast(HOME_LOOK[h].toast);
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
