const canvas = document.querySelector('#world-canvas');
const context = canvas.getContext('2d');
const worldState = document.querySelector('#world-state');
const gameDay = document.querySelector('#game-day');
const calendarStatus = document.querySelector('#calendar-status');
const regionCount = document.querySelector('#region-count');
const historyCount = document.querySelector('#history-count');
const historyList = document.querySelector('#history-list');
const registerForm = document.querySelector('#register-form');
const registrationResult = document.querySelector('#registration-result');
const actionResult = document.querySelector('#action-result');
const worldNewsList = document.querySelector('#world-news-list');
const activeEventsList = document.querySelector('#active-events-list');

const foundationSites = [
  { x: 0.22, y: 0.57, name: 'Unclaimed River Basin', color: '#d2a448', size: 10, terrain: 'river plain' },
  { x: 0.39, y: 0.42, name: 'Stone Outcrop', color: '#8f9ca7', size: 8, terrain: 'highland stone' },
  { x: 0.63, y: 0.34, name: 'Old Forest Edge', color: '#4f9d70', size: 8, terrain: 'woodland' },
  { x: 0.74, y: 0.58, name: 'Cold Marsh', color: '#5879c9', size: 7, terrain: 'wetland' },
  { x: 0.52, y: 0.72, name: 'Salt Coast', color: '#c2b170', size: 7, terrain: 'coast' }
];

const terrainBands = ['#2d3f2f', '#334b39', '#53603d', '#777044', '#4f5f63', '#3b3328'];
const actionCopy = {
  travel: 'Scouted a nearby route. A map marker was added locally.',
  forage: 'Foraging result recorded locally. Food systems still need queued server actions.',
  camp: 'Camp preparation recorded locally. Construction persistence is the next backend step.',
  teach: 'Teaching requires at least two characters and a knowledge transmission endpoint.',
  trade: 'Trade requires two groups, local resources, and a barter action queue.',
  govern: 'Governance unlocks after a society has members, legitimacy, and territory.',
  craft: 'Crafting requires inventory records and recipe validation.',
  chronicle: 'Chronicles become permanent when writing or oral-history recording is implemented.',
  character: 'Characters unlock after successful account registration.',
  family: 'Family lines unlock after character mortality and lineage records exist.',
  society: 'Society pages unlock after groups, legitimacy, and territory exist.',
  learn: 'Knowledge pages are represented by the Technology Tree panel until research routes are added.',
  culture: 'Culture records unlock after repeated player rituals, language, law, and chronicle events.',
  rules: 'Rules will be served as authored project documentation once a documentation route exists.',
  wiki: 'Wiki pages will be generated from implemented systems and confirmed lore.',
  support: 'Support will link to a real project contact or issue flow when configured.',
  'inspect-region': 'This starting region has water, forage, wood, stone, and migration pressure.',
  'focus-map': 'Map focused. Use Travel, Forage, or Camp to add local exploration signals.'
};

const clientState = {
  calendar: null,
  regions: [],
  events: [],
  localSignals: [],
  lastAction: null,
  apiOnline: false
};

let pulse = 0;

function text(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function getVisibleSites() {
  if (clientState.regions.length === 0) {
    return foundationSites;
  }

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

function drawCoast(width, height) {
  context.save();
  context.translate(width * 0.04, height * 0.1);
  context.beginPath();
  context.moveTo(width * 0.03, height * 0.42);

  const points = [
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

  for (const [x, y] of points) {
    context.lineTo(width * x, height * y);
  }

  context.closePath();
  context.fillStyle = '#314536';
  context.fill();
  context.clip();

  for (let i = 0; i < 42; i += 1) {
    const x = ((i * 137) % 1000) / 1000;
    const y = ((i * 293) % 1000) / 1000;
    const radius = 70 + ((i * 19) % 90);
    const gradient = context.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
    gradient.addColorStop(0, `${terrainBands[i % terrainBands.length]}cc`);
    gradient.addColorStop(1, 'rgba(20, 24, 18, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  context.globalAlpha = 0.24;
  context.strokeStyle = '#d8bd7a';
  context.lineWidth = 1;
  for (let i = 0; i < 16; i += 1) {
    context.beginPath();
    const y = height * (0.12 + i * 0.05);
    context.moveTo(width * 0.08, y);
    context.bezierCurveTo(width * 0.28, y + Math.sin(i) * 28, width * 0.54, y - 38, width * 0.88, y + 18);
    context.stroke();
  }

  context.restore();
}

function drawRoute(from, to, width, height) {
  context.save();
  context.strokeStyle = 'rgba(235, 210, 148, 0.33)';
  context.lineWidth = 2;
  context.setLineDash([6, 8]);
  context.beginPath();
  context.moveTo(from.x * width, from.y * height);
  context.quadraticCurveTo(width * 0.5, height * 0.45, to.x * width, to.y * height);
  context.stroke();
  context.restore();
}

function drawSite(point, width, height) {
  const x = point.x * width;
  const y = point.y * height;
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

function drawSignal(point, width, height) {
  const x = point.x * width;
  const y = point.y * height;
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

function drawWorld() {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
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

  drawCoast(width, height);

  for (let i = 0; i < sites.length - 1; i += 1) {
    drawRoute(sites[i], sites[i + 1], width, height);
  }

  for (const point of sites) {
    drawSite(point, width, height);
  }

  for (const point of clientState.localSignals) {
    drawSignal(point, width, height);
  }

  window.requestAnimationFrame(drawWorld);
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

function renderHistory() {
  const events = clientState.events;
  historyCount.textContent = `${events.length} records`;

  if (events.length === 0) {
    historyList.replaceChildren(
      makeListItem('No recorded history', 'Chronicles will appear here after players generate historical events.')
    );
    return;
  }

  historyList.replaceChildren(
    ...events.slice(0, 6).map((event) => {
      const label = event.tick_number ? `Tick ${event.tick_number}` : (event.scope ?? 'World');
      return makeListItem(label, event.summary);
    })
  );
}

function renderWorldNews() {
  const events = clientState.events;

  if (events.length === 0) {
    worldNewsList.replaceChildren(makeListItem('No world news', 'News is generated from actual historical events.'));
    return;
  }

  worldNewsList.replaceChildren(
    ...events.slice(0, 4).map((event) => makeListItem(event.summary, event.event_type ?? 'historical event'))
  );
}

function renderActiveEvents() {
  const activeEvents = clientState.events.filter((event) => {
    const payload = event.payload ?? {};
    return payload.active === true || payload.ends_at || payload.endsOnTick;
  });

  if (activeEvents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'event-card';
    empty.append(
      Object.assign(document.createElement('strong'), { textContent: 'No active events' }),
      Object.assign(document.createElement('span'), {
        textContent:
          'Famines, elections, migrations, wars, and festivals will appear only when simulation data creates them.'
      })
    );
    activeEventsList.replaceChildren(empty);
    return;
  }

  activeEventsList.replaceChildren(
    ...activeEvents.slice(0, 4).map((event) => {
      const card = document.createElement('div');
      card.className = 'event-card';
      card.append(
        Object.assign(document.createElement('strong'), { textContent: event.summary }),
        Object.assign(document.createElement('span'), { textContent: event.event_type ?? 'active world event' })
      );
      return card;
    })
  );
}

function renderDerivedWorldState() {
  const calendar = clientState.calendar;
  const regionTotal = clientState.regions.length;
  const historyTotal = clientState.events.length;
  const day = Number(calendar?.game_day ?? 0);
  const hasCalendar = Boolean(calendar?.has_time_concept);
  const apiLabel = clientState.apiOnline ? 'API connected' : 'Static preview';

  worldState.textContent = hasCalendar ? 'Civilization begins' : 'Dawn of settlement';
  gameDay.textContent = hasCalendar ? `Day ${day}` : `${apiLabel}: no calendar`;
  calendarStatus.textContent = hasCalendar ? `Day ${day}` : 'Not invented';
  regionCount.textContent = String(regionTotal);

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
    const [calendarPayload, regionsPayload, historyPayload] = await Promise.all([
      fetchJson('/world/calendar'),
      fetchJson('/world/regions'),
      fetchJson('/world/history')
    ]);

    clientState.calendar = calendarPayload.calendar ?? null;
    clientState.regions = regionsPayload.regions ?? [];
    clientState.events = historyPayload.events ?? [];
    clientState.apiOnline = true;
  } catch {
    clientState.calendar = null;
    clientState.regions = [];
    clientState.events = [];
    clientState.apiOnline = false;
  }

  renderAll();
}

function addLocalSignal(action) {
  const signalColors = {
    travel: 'rgba(245, 218, 139, 0.86)',
    forage: 'rgba(114, 185, 92, 0.86)',
    camp: 'rgba(194, 177, 112, 0.86)'
  };

  if (!signalColors[action]) {
    return;
  }

  clientState.localSignals = [
    ...clientState.localSignals,
    {
      x: 0.15 + Math.random() * 0.7,
      y: 0.2 + Math.random() * 0.58,
      color: signalColors[action]
    }
  ].slice(-14);
}

function handlePrototypeAction(action) {
  clientState.lastAction = action;
  addLocalSignal(action);
  actionResult.textContent = actionCopy[action] ?? 'Action acknowledged.';

  if (action === 'focus-map') {
    canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);

  registrationResult.textContent = 'Registering...';

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.get('email'),
        displayName: formData.get('displayName'),
        password: formData.get('password')
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      registrationResult.textContent = payload.error ?? 'Registration failed.';
      return;
    }

    registrationResult.textContent = payload.account.isCreator
      ? 'Creator account created. The world still has no calendar.'
      : payload.world.dayOneStarted
        ? 'First player registered. Day 1 has begun.'
        : 'Player account created.';

    text('#player-heading', payload.account.displayName);
    text(
      '#player-summary',
      payload.account.isCreator
        ? 'Creator account. Waiting for the first normal player.'
        : 'First generation character account.'
    );
    text('#reputation-stat', 'Unwritten');
    text('#influence-stat', payload.account.isCreator ? 'Creator' : '1');
    text('#learning-stat', 'Oral');

    registerForm.reset();
    await loadWorldState();
  } catch {
    registrationResult.textContent =
      'Registration service unavailable. Set DATABASE_URL and run the Express server to enable accounts.';
  }
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => handlePrototypeAction(button.dataset.action));
});

document.querySelector('#map-reset-button').addEventListener('click', () => {
  clientState.localSignals = [];
  actionResult.textContent = 'Local map signals cleared.';
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
drawWorld();
loadWorldState();
window.setInterval(loadWorldState, 10000);
