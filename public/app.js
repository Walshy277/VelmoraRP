const apiBase = '';
const tokenKey = 'velmora_token';
const accountKey = 'velmora_account';

let sessionToken = localStorage.getItem(tokenKey) || null;
let sessionAccount = JSON.parse(localStorage.getItem(accountKey) || 'null');
let myCharacters = [];
let activeCharacterId = localStorage.getItem('velmora_active_character') || null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (sessionToken) opts.headers['Authorization'] = `Bearer ${sessionToken}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${apiBase}${path}`, opts);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function toast(message, type = 'info') {
  const container = $('#toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 4000);
}

function saveSession(token, account) {
  sessionToken = token;
  sessionAccount = account;
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(accountKey, JSON.stringify(account));
  renderAuthState();
}

function clearSession() {
  sessionToken = null;
  sessionAccount = null;
  activeCharacterId = null;
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(accountKey);
  localStorage.removeItem('velmora_active_character');
  myCharacters = [];
  renderAuthState();
}

function renderAuthState() {
  const accountPanel = $('#account-panel');
  const sessionPanel = $('#session-panel');
  if (!accountPanel || !sessionPanel) return;

  if (sessionAccount) {
    accountPanel.style.display = 'none';
    sessionPanel.style.display = '';
    $('#session-display-name').textContent = sessionAccount.displayName;
    const charsText =
      myCharacters.length > 0 ? `Characters: ${myCharacters.map((c) => c.name).join(', ')}` : 'No characters yet.';
    $('#session-characters').textContent = charsText;
  } else {
    accountPanel.style.display = '';
    sessionPanel.style.display = 'none';
  }
}

const charDialog = $('#character-dialog');
$('#show-create-character')?.addEventListener('click', () => {
  $('#character-name').value = '';
  charDialog.showModal();
});
$('#character-cancel')?.addEventListener('click', () => charDialog.close());
$('#character-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#character-name').value.trim();
  if (!name) return;
  const { ok, data } = await api('POST', '/characters', { name });
  if (ok) {
    toast(`Character ${data.character.name} created!`, 'success');
    charDialog.close();
    await loadMyCharacters();
  } else {
    toast(data.error || 'Failed to create character', 'error');
  }
});

async function loadMyCharacters() {
  if (!sessionToken) {
    myCharacters = [];
    return;
  }
  const { ok, data } = await api('GET', '/world/characters');
  if (ok) {
    myCharacters = (data.characters || []).filter((c) => c.account_id === sessionAccount.id);
    if (myCharacters.length > 0 && !activeCharacterId) {
      activeCharacterId = myCharacters[0].id;
      localStorage.setItem('velmora_active_character', activeCharacterId);
    }
    renderAuthState();
  }
}

$('#register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = { email: fd.get('email'), displayName: fd.get('displayName'), password: fd.get('password') };
  $('#auth-result').textContent = 'Registering...';
  const { ok, data } = await api('POST', '/auth/register', body);
  if (!ok) {
    $('#auth-result').textContent = data.error || 'Registration failed.';
    toast(data.error || 'Registration failed', 'error');
    return;
  }
  toast('Account created! Log in to play.', 'success');
  $('#auth-result').textContent = 'Account created. Log in above.';
  e.target.reset();
});

$('#login-submit')?.addEventListener('click', async () => {
  const email = $('#email').value;
  const password = $('#password').value;
  if (!email || !password) {
    toast('Enter email and password.', 'error');
    return;
  }
  $('#auth-result').textContent = 'Logging in...';
  const { ok, data } = await api('POST', '/auth/login', { email, password });
  if (!ok) {
    $('#auth-result').textContent = data.error || 'Login failed.';
    toast(data.error || 'Login failed', 'error');
    return;
  }
  saveSession(data.token, data.account);
  toast(`Welcome, ${data.account.displayName}!`, 'success');
  $('#auth-result').textContent = 'Logged in.';
  $('#email').value = '';
  $('#password').value = '';
  $('#display-name').value = '';
  await loadMyCharacters();
  await loadWorldState();
});

$('#logout-button')?.addEventListener('click', () => {
  clearSession();
  toast('Logged out.', 'info');
  loadWorldState();
});

const canvas = $('#world-canvas');
const context = canvas.getContext('2d');

const foundationSites = [
  { x: 0.22, y: 0.57, name: 'Unclaimed River Basin', color: '#d2a448', size: 10, terrain: 'river plain' },
  { x: 0.39, y: 0.42, name: 'Stone Outcrop', color: '#8f9ca7', size: 8, terrain: 'highland stone' },
  { x: 0.63, y: 0.34, name: 'Old Forest Edge', color: '#4f9d70', size: 8, terrain: 'woodland' },
  { x: 0.74, y: 0.58, name: 'Cold Marsh', color: '#5879c9', size: 7, terrain: 'wetland' },
  { x: 0.52, y: 0.72, name: 'Salt Coast', color: '#c2b170', size: 7, terrain: 'coast' }
];

const terrainBands = ['#2d3f2f', '#334b39', '#53603d', '#777044', '#4f5f63', '#3b3328'];
let pulse = 0;
const clientState = { calendar: null, regions: [], events: [], localSignals: [], apiOnline: false };

function text(sel, val) {
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

function getVisibleSites() {
  if (clientState.regions.length === 0) return foundationSites;
  return clientState.regions.slice(0, 12).map((region, index) => {
    const base = foundationSites[index % foundationSites.length];
    return {
      ...base,
      name: region.name,
      terrain: [region.terrain, region.climate].filter(Boolean).join(', ') || base.terrain,
      x: 0.16 + ((index * 0.17) % 0.68),
      y: 0.25 + ((index * 0.23) % 0.5)
    };
  });
}

function drawMap() {
  if (!canvas) {
    window.requestAnimationFrame(drawMap);
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const width = rect.width,
    height = rect.height;
  if (width <= 0 || height <= 0) {
    window.requestAnimationFrame(drawMap);
    return;
  }
  const sites = getVisibleSites();
  pulse += 0.01;

  const sea = context.createLinearGradient(0, 0, width, height);
  sea.addColorStop(0, '#26393b');
  sea.addColorStop(0.55, '#182720');
  sea.addColorStop(1, '#352d20');
  context.fillStyle = sea;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.16;
  context.strokeStyle = '#e5c77b';
  for (let x = 0; x < width; x += 38) {
    context.beginPath();
    context.moveTo(x + Math.sin(pulse + x) * 3, 0);
    context.lineTo(x - 28, height);
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(width * 0.04, height * 0.1);
  context.beginPath();
  context.moveTo(width * 0.03, height * 0.42);
  const pts = [
    [0.1, 0.24],
    [0.2, 0.18],
    [0.34, 0.21],
    [0.43, 0.12],
    [0.58, 0.2],
    [0.7, 0.15],
    [0.86, 0.28],
    [0.91, 0.47],
    [0.82, 0.62],
    [0.69, 0.68],
    [0.58, 0.83],
    [0.42, 0.72],
    [0.29, 0.79],
    [0.18, 0.67],
    [0.06, 0.62]
  ];
  for (const [px, py] of pts) context.lineTo(width * px, height * py);
  context.closePath();
  context.fillStyle = '#314536';
  context.fill();
  context.clip();
  for (let i = 0; i < 42; i++) {
    const bx = ((i * 137) % 1000) / 1000;
    const by = ((i * 293) % 1000) / 1000;
    const radius = 70 + ((i * 19) % 90);
    const grad = context.createRadialGradient(width * bx, height * by, 0, width * bx, height * by, radius);
    grad.addColorStop(0, `${terrainBands[i % terrainBands.length]}cc`);
    grad.addColorStop(1, 'rgba(20, 24, 18, 0)');
    context.fillStyle = grad;
    context.fillRect(0, 0, width, height);
  }
  context.globalAlpha = 0.24;
  context.strokeStyle = '#d8bd7a';
  context.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    context.beginPath();
    const ly = height * (0.12 + i * 0.05);
    context.moveTo(width * 0.08, ly);
    context.bezierCurveTo(width * 0.28, ly + Math.sin(i) * 28, width * 0.54, ly - 38, width * 0.88, ly + 18);
    context.stroke();
  }
  context.restore();

  for (let i = 0; i < sites.length - 1; i++) {
    context.save();
    context.strokeStyle = 'rgba(235, 210, 148, 0.33)';
    context.lineWidth = 2;
    context.setLineDash([6, 8]);
    context.beginPath();
    context.moveTo(sites[i].x * width, sites[i].y * height);
    context.quadraticCurveTo(width * 0.5, height * 0.45, sites[i + 1].x * width, sites[i + 1].y * height);
    context.stroke();
    context.restore();
  }

  for (const point of sites) {
    const x = point.x * width,
      y = point.y * height;
    const radius = point.size + Math.sin(pulse * 3 + point.x * 10) * 1.2;
    context.save();
    context.fillStyle = 'rgba(8, 9, 7, 0.5)';
    context.beginPath();
    context.arc(x, y + 2, radius * 2.5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = point.color;
    context.strokeStyle = '#f0d998';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = '#f5e8c9';
    context.font = '12px Georgia, serif';
    context.textAlign = 'center';
    context.fillText(point.name, x, y + radius + 18);
    context.restore();
  }

  for (const point of clientState.localSignals) {
    const x = point.x * width,
      y = point.y * height;
    const radius = 7 + Math.sin(pulse * 4 + point.x) * 2;
    context.save();
    context.strokeStyle = 'rgba(245, 218, 139, 0.55)';
    context.fillStyle = point.color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(x, y, radius * 3.2, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  window.requestAnimationFrame(drawMap);
}

function renderHistory() {
  const events = clientState.events;
  const historyList = $('#history-list');
  const historyCount = $('#history-count');
  if (historyCount) historyCount.textContent = `${events.length} records`;
  if (!historyList) return;
  if (events.length === 0) {
    historyList.replaceChildren(
      makeListItem('No recorded history', 'Chronicles appear after players generate historical events.')
    );
    return;
  }
  historyList.replaceChildren(
    ...events.slice(0, 6).map((e) => {
      const label = e.tick_number ? `Tick ${e.tick_number}` : (e.scope ?? 'World');
      return makeListItem(label, e.summary);
    })
  );
}

function renderWorldNews() {
  const list = $('#world-news-list');
  if (!list) return;
  const events = clientState.events;
  if (events.length === 0) {
    list.replaceChildren(makeListItem('No world news', 'News comes from historical events.'));
    return;
  }
  list.replaceChildren(...events.slice(0, 4).map((e) => makeListItem(e.summary, e.event_type ?? 'event')));
}

function renderActiveEvents() {
  const list = $('#active-events-list');
  if (!list) return;
  const active = clientState.events.filter((e) => {
    const p = e.payload ?? {};
    return p.active === true || p.ends_at || p.endsOnTick;
  });
  if (active.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'event-card';
    empty.append(
      Object.assign(document.createElement('strong'), { textContent: 'No active events' }),
      Object.assign(document.createElement('span'), {
        textContent: 'Famines, wars, festivals appear when simulation creates them.'
      })
    );
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(
    ...active.slice(0, 4).map((e) => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.append(
        Object.assign(document.createElement('strong'), { textContent: e.summary }),
        Object.assign(document.createElement('span'), { textContent: e.event_type ?? 'event' })
      );
      return card;
    })
  );
}

function makeListItem(primary, secondary) {
  const item = document.createElement('li');
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  title.textContent = primary;
  detail.textContent = secondary;
  item.append(title, detail);
  return item;
}

function renderDerivedWorldState() {
  const calendar = clientState.calendar;
  const regionTotal = clientState.regions.length;
  const historyTotal = clientState.events.length;
  const day = Number(calendar?.game_day ?? 0);
  const hasCalendar = Boolean(calendar?.has_time_concept);
  const apiLabel = clientState.apiOnline ? 'API connected' : 'Static preview';

  text('#world-state', hasCalendar ? 'Civilization begins' : 'Dawn of settlement');
  text('#game-day', hasCalendar ? `Day ${day}` : `${apiLabel}: no calendar`);
  text('#calendar-status', hasCalendar ? `Day ${day}` : 'Not invented');
  text('#region-count', String(regionTotal));
  text('#population-stat', hasCalendar ? 'First generation active' : '0 registered');
  text('#culture-stat', historyTotal > 0 ? 'Emerging from events' : 'Unformed');
  text('#religion-stat', 'No shared rites');
  text('#government-stat', 'None');
  text('#prosperity-stat', regionTotal > 0 ? 'Surveying resources' : 'Subsistence');
  text('#security-stat', clientState.apiOnline ? 'Unmeasured' : 'Offline preview');
  text('#civilization-count', '0');
  text('#culture-count', historyTotal > 0 ? '1 emerging' : '0');
  text('#footer-civilizations', 'Civilizations: 0');
  text('#footer-cultures', `Cultures: ${historyTotal > 0 ? '1 emerging' : '0'}`);
  text('#footer-polities', 'Active polities: 0');
  text('#footer-population', hasCalendar ? 'Registered population: started' : 'Registered population: 0');
  text('#footer-age', hasCalendar ? `World age: ${day} days` : 'World age: awaiting Day 1');
}

function renderAll() {
  renderDerivedWorldState();
  renderHistory();
  renderWorldNews();
  renderActiveEvents();
}

async function loadWorldState() {
  try {
    const [calRes, regRes, histRes] = await Promise.all([
      api('GET', '/world/calendar'),
      api('GET', '/world/regions'),
      api('GET', '/world/history')
    ]);
    clientState.calendar = calRes.data.calendar ?? null;
    clientState.regions = regRes.data.regions ?? [];
    clientState.events = histRes.data.events ?? [];
    clientState.apiOnline = true;
  } catch {
    clientState.calendar = null;
    clientState.regions = [];
    clientState.events = [];
    clientState.apiOnline = false;
  }
  renderAll();
}

async function handleAction(actionType, extraPayload = {}) {
  if (!sessionToken) {
    toast('Log in first.', 'error');
    return;
  }
  if (!activeCharacterId && myCharacters.length > 0) {
    activeCharacterId = myCharacters[0].id;
    localStorage.setItem('velmora_active_character', activeCharacterId);
  }
  if (!activeCharacterId) {
    toast('Create a character first.', 'error');
    return;
  }
  const payload = { characterId: activeCharacterId, ...extraPayload };
  const { ok, data } = await api('POST', '/actions', {
    actionType,
    characterId: activeCharacterId,
    payload
  });
  if (ok) {
    toast(`Action queued: ${actionType}`, 'success');
  } else {
    toast(data.error || 'Action failed', 'error');
  }
}

const actionMapping = {
  travel: 'travel',
  forage: 'gather_resource',
  camp: 'build_structure',
  craft: 'craft_item',
  teach: 'teach',
  trade: 'gather_resource',
  govern: null,
  chronicle: null
};

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    const mapped = actionMapping[a];
    if (mapped) {
      handleAction(mapped);
    } else if (a === 'inspect-region') {
      toast('This starting region has water, forage, wood, stone, and migration pressure.', 'info');
    } else if (a === 'focus-map') {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (a === 'character' || a === 'family' || a === 'society' || a === 'learn' || a === 'culture') {
      toast(`"${a}" view will be available in a future update.`, 'info');
    } else {
      toast(`"${a}" is not yet wired.`, 'info');
    }
  });
});

$('#map-reset-button')?.addEventListener('click', () => {
  clientState.localSignals = [];
  toast('Map signals cleared.', 'info');
});

window.addEventListener('resize', resizeCanvas);

renderAuthState();
loadWorldState();
if (sessionToken) loadMyCharacters();
window.setInterval(loadWorldState, 10000);
resizeCanvas();
window.requestAnimationFrame(drawMap);
