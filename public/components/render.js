import { api } from './api.js';
import { getSessionAccount } from './auth.js';

const clientState = { regions: [], events: [], apiOnline: false };

export function getClientState() { return clientState; }

export function setWorldState(regions, events, online) {
  clientState.regions = regions || [];
  clientState.events = events || [];
  clientState.apiOnline = online;
  renderAll();
}

function text(sel, val) {
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
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

export function renderHeroPanel() {
  const account = getSessionAccount();
  const headingEl = document.querySelector('#player-heading');
  const summaryEl = document.querySelector('#player-summary');
  const labelEl = document.querySelector('.hero-panel .label');

  if (!headingEl) return;

  if (account) {
    if (labelEl) labelEl.textContent = 'Active Adventurer';
    headingEl.textContent = account.displayName || 'The Creator';
    if (summaryEl) summaryEl.textContent = 'You are shaping the history of Velmora. May your deeds be remembered.';
  } else {
    if (labelEl) labelEl.textContent = 'Foundation State';
    headingEl.textContent = 'No Character Claimed';
    if (summaryEl) summaryEl.textContent = 'Register an account to become part of the first playable generation.';
  }
}

function renderDerivedWorldState() {
  const regionTotal = clientState.regions.length;
  const historyTotal = clientState.events.length;
  const apiLabel = clientState.apiOnline ? 'API connected' : 'Static preview';

  text('#world-state', 'Dawn of Civilization');
  text('#game-day', apiLabel);
  text('#calendar-status', regionTotal > 0 ? `${regionTotal} regions available` : 'No regions');
  text('#region-count', String(regionTotal));
  text('#population-stat', '0 registered');
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
  text('#footer-population', 'Registered population: 0');
  text('#footer-age', 'World age: tick simulation running');
}

function renderHistory() {
  const events = clientState.events;
  const list = document.querySelector('#history-list');
  const count = document.querySelector('#history-count');
  if (count) count.textContent = `${events.length} records`;
  if (!list) return;
  if (events.length === 0) {
    list.replaceChildren(makeListItem('No recorded history', 'Chronicles appear after players generate historical events.'));
    return;
  }
  list.replaceChildren(
    ...events.slice(0, 6).map(e => {
      const label = e.tick_number ? `Tick ${e.tick_number}` : (e.scope ?? 'World');
      return makeListItem(label, e.summary);
    })
  );
}

function renderWorldNews() {
  const list = document.querySelector('#world-news-list');
  if (!list) return;
  const events = clientState.events;
  if (events.length === 0) {
    list.replaceChildren(makeListItem('No world news', 'News comes from historical events.'));
    return;
  }
  list.replaceChildren(
    ...events.slice(0, 4).map(e => makeListItem(e.summary, e.event_type ?? 'event'))
  );
}

function renderActiveEvents() {
  const list = document.querySelector('#active-events-list');
  if (!list) return;
  const active = clientState.events.filter(e => {
    const p = e.payload ?? {};
    return p.active === true || p.ends_at || p.endsOnTick;
  });
  if (active.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'event-card';
    empty.append(
      Object.assign(document.createElement('strong'), { textContent: 'No active events' }),
      Object.assign(document.createElement('span'), { textContent: 'Famines, wars, festivals appear when simulation creates them.' })
    );
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(
    ...active.slice(0, 4).map(e => {
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

function renderAll() {
  renderHeroPanel();
  renderDerivedWorldState();
  renderHistory();
  renderWorldNews();
  renderActiveEvents();
}

export async function loadWorldState() {
  try {
    const [reg, hist] = await Promise.all([
      api('GET', '/world/regions'),
      api('GET', '/world/history')
    ]);
    setWorldState(reg.data.regions, hist.data.events, true);
  } catch {
    setWorldState([], [], false);
  }
}
