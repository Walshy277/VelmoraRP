import { api } from './api.js';
import { getSessionAccount, getMyCharacters, getActiveCharacterId, loadMyCharacters } from './auth.js';
import { resetPendingCount } from './actions.js';

const clientState = { regions: [], events: [], tick: null, apiOnline: false };

export function getClientState() { return clientState; }

export function setWorldState(regions, events, tick, online) {
  clientState.regions = regions || [];
  clientState.events = events || [];
  clientState.tick = tick || null;
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

function setBar(id, current, max) {
  const fill = document.querySelector(id);
  if (!fill) return;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  fill.style.width = Math.min(100, pct) + '%';
}

function setText(id, val) {
  const el = document.querySelector(id);
  if (el) el.textContent = val;
}

function setDisplay(id, show) {
  const el = document.querySelector(id);
  if (el) el.style.display = show ? '' : 'none';
}

export function renderCharacterResources() {
  const chars = getMyCharacters();
  const activeId = getActiveCharacterId();
  const char = chars.find(c => c.id === activeId) || chars[0];

  if (char && char.resources) {
    setDisplay('#resource-bars', true);
    setDisplay('#stat-bars', true);
    const r = char.resources;
    setBar('#vigor-fill', r.vigor, r.maxVigor);
    setText('#vigor-text', `${r.vigor}/${r.maxVigor}`);
    setBar('#focus-fill', r.focus, r.maxFocus);
    setText('#focus-text', `${r.focus}/${r.maxFocus}`);
    setBar('#morale-fill', r.morale, r.maxMorale);
    setText('#morale-text', `${r.morale}/${r.maxMorale}`);
    setBar('#saturation-fill', r.saturation, r.maxSaturation);
    setText('#saturation-text', `${r.saturation}/${r.maxSaturation}`);
    const s = char.stats;
    if (s) {
      setText('#might-stat', s.might);
      setText('#fortitude-stat', s.fortitude);
      setText('#dexterity-stat', s.dexterity);
      setText('#intellect-stat', s.intellect);
      setText('#cunning-stat', s.cunning);
      setText('#presence-stat', s.presence);
    }
    setText('#health-stat', char.health);
    setText('#hunger-stat', r.saturation > 50 ? 'Sated' : r.saturation > 25 ? 'Hungry' : r.saturation > 0 ? 'Starving' : 'Famished');
    setText('#character-status', char.status);
    setText('#age-stat', `${char.ageDays} days`);
    setText('#current-location-name', char.regionName || 'Unknown');
    setText('#current-location-detail', `Surviving in ${char.regionName || 'the wild'}`);
    const invContainer = document.querySelector('#inventory-contents');
    if (invContainer) {
      const items = char.inventory || {};
      const entries = Object.entries(items).filter(([, v]) => Number(v) > 0);
      if (entries.length === 0) {
        invContainer.innerHTML = '<p class="status-text">Inventory is empty. Forage or hunt to gather supplies.</p>';
      } else {
        invContainer.innerHTML = `<div class="inventory-grid">${entries.map(([item, qty]) =>
          `<div class="inv-item"><span class="inv-name">${item}</span><span class="inv-qty">${qty}</span></div>`
        ).join('')}</div>`;
      }
    }
    const knowContainer = document.querySelector('#known-knowledge');
    if (knowContainer) {
      const knowledge = char.knowledge || [];
      if (knowledge.length === 0) {
        knowContainer.innerHTML = '<p class="status-text">No knowledge yet. Learn from others or discover through action.</p>';
      } else {
        knowContainer.innerHTML = `<div class="knowledge-tags">${knowledge.map(k =>
          `<span class="knowledge-tag">${k.name} <em>${k.proficiency}%</em></span>`
        ).join('')}</div>`;
      }
    }
  } else {
    setDisplay('#resource-bars', false);
    setDisplay('#stat-bars', false);
    setText('#health-stat', '--');
    setText('#hunger-stat', '--');
    setText('#character-status', '--');
    setText('#age-stat', '--');
    setText('#current-location-name', 'Unknown');
    setText('#current-location-detail', 'Create a character to begin.');
    const invContainer = document.querySelector('#inventory-contents');
    if (invContainer) invContainer.innerHTML = '<p class="status-text">No character selected.</p>';
    const knowContainer = document.querySelector('#known-knowledge');
    if (knowContainer) knowContainer.innerHTML = '<p class="status-text">No character selected.</p>';
  }
}

export function renderHeroPanel() {
  const account = getSessionAccount();
  const headingEl = document.querySelector('#player-heading');
  const summaryEl = document.querySelector('#player-summary');

  if (!headingEl) return;

  if (account) {
    headingEl.textContent = account.displayName || 'The Creator';
    const chars = getMyCharacters();
    const activeId = getActiveCharacterId();
    const char = chars.find(c => c.id === activeId) || chars[0];
    if (char) {
      summaryEl.textContent = `Surviving day ${char.ageDays} as ${char.name}.`;
    } else {
      summaryEl.textContent = 'Create a character to begin your legend.';
    }
  } else {
    headingEl.textContent = 'No Character Claimed';
    summaryEl.textContent = 'Register an account to begin your legend.';
  }
  renderCharacterResources();
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

import { getMyCharacters, getActiveCharacterId } from './auth.js';

function setBar(id, current, max) {
  const fill = document.querySelector(id);
  if (!fill) return;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  fill.style.width = Math.min(100, pct) + '%';
}

function setText(id, val) {
  const el = document.querySelector(id);
  if (el) el.textContent = val;
}

function setDisplay(id, show) {
  const el = document.querySelector(id);
  if (el) el.style.display = show ? '' : 'none';
}

export function renderCharacterResources() {
  const chars = getMyCharacters();
  const activeId = getActiveCharacterId();
  const char = chars.find(c => c.id === activeId) || chars[0];

  if (char && char.resources) {
    setDisplay('#resource-bars', true);
    setDisplay('#stat-bars', true);
    const r = char.resources;
    setBar('#vigor-fill', r.vigor, r.maxVigor);
    setText('#vigor-text', `${r.vigor}/${r.maxVigor}`);
    setBar('#focus-fill', r.focus, r.maxFocus);
    setText('#focus-text', `${r.focus}/${r.maxFocus}`);
    setBar('#morale-fill', r.morale, r.maxMorale);
    setText('#morale-text', `${r.morale}/${r.maxMorale}`);
    setBar('#saturation-fill', r.saturation, r.maxSaturation);
    setText('#saturation-text', `${r.saturation}/${r.maxSaturation}`);
    const s = char.stats;
    if (s) {
      setText('#might-stat', s.might);
      setText('#fortitude-stat', s.fortitude);
      setText('#dexterity-stat', s.dexterity);
      setText('#intellect-stat', s.intellect);
      setText('#cunning-stat', s.cunning);
      setText('#presence-stat', s.presence);
    }
    setText('#health-stat', char.health);
    setText('#hunger-stat', r.saturation > 50 ? 'Sated' : r.saturation > 25 ? 'Hungry' : r.saturation > 0 ? 'Starving' : 'Famished');
    setText('#character-status', char.status);
    setText('#age-stat', `${char.ageDays} days`);
    setText('#current-location-name', char.regionName || 'Unknown');
    setText('#current-location-detail', `Surviving in ${char.regionName || 'the wild'}`);
    const invContainer = document.querySelector('#inventory-contents');
    if (invContainer) {
      const items = char.inventory || {};
      const entries = Object.entries(items).filter(([, v]) => Number(v) > 0);
      if (entries.length === 0) {
        invContainer.innerHTML = '<p class="status-text">Inventory is empty. Forage or hunt to gather supplies.</p>';
      } else {
        invContainer.innerHTML = `<div class="inventory-grid">${entries.map(([item, qty]) =>
          `<div class="inv-item"><span class="inv-name">${item}</span><span class="inv-qty">${qty}</span></div>`
        ).join('')}</div>`;
      }
    }
    const knowContainer = document.querySelector('#known-knowledge');
    if (knowContainer) {
      const knowledge = char.knowledge || [];
      if (knowledge.length === 0) {
        knowContainer.innerHTML = '<p class="status-text">No knowledge yet. Learn from others or discover through action.</p>';
      } else {
        knowContainer.innerHTML = `<div class="knowledge-tags">${knowledge.map(k =>
          `<span class="knowledge-tag">${k.name} <em>${k.proficiency}%</em></span>`
        ).join('')}</div>`;
      }
    }
  } else {
    setDisplay('#resource-bars', false);
    setDisplay('#stat-bars', false);
    setText('#health-stat', '--');
    setText('#hunger-stat', '--');
    setText('#character-status', '--');
    setText('#age-stat', '--');
    setText('#current-location-name', 'Unknown');
    setText('#current-location-detail', 'Create a character to begin.');
    const invContainer = document.querySelector('#inventory-contents');
    if (invContainer) invContainer.innerHTML = '<p class="status-text">No character selected.</p>';
    const knowContainer = document.querySelector('#known-knowledge');
    if (knowContainer) knowContainer.innerHTML = '<p class="status-text">No character selected.</p>';
  }
}

export function renderHeroPanel() {
  const account = getSessionAccount();
  const headingEl = document.querySelector('#player-heading');
  const summaryEl = document.querySelector('#player-summary');

  if (!headingEl) return;

  if (account) {
    headingEl.textContent = account.displayName || 'The Creator';
    const chars = getMyCharacters();
    const activeId = getActiveCharacterId();
    const char = chars.find(c => c.id === activeId) || chars[0];
    if (char) {
      summaryEl.textContent = `Surviving day ${char.ageDays} as ${char.name}.`;
    } else {
      summaryEl.textContent = 'Create a character to begin your legend.';
    }
  } else {
    headingEl.textContent = 'No Character Claimed';
    summaryEl.textContent = 'Register an account to begin your legend.';
  }
  renderCharacterResources();
}

function renderDerivedWorldState() {
  const regionTotal = clientState.regions.length;
  const historyTotal = clientState.events.length;
  const tick = clientState.tick;
  const tickLabel = tick ? `Tick ${tick.tick_number}` : 'Tick-based';
  const apiLabel = clientState.apiOnline ? 'Online' : 'Offline';

  text('#world-state', 'The World of Velmora');
  text('#game-day', `${tickLabel} — ${apiLabel}`);
  text('#region-count', String(regionTotal));
  text('#footer-tick', tick ? `Tick: ${tick.tick_number}` : 'Tick: --');
  text('#footer-age', tick ? `World age: ${tick.tick_number} ticks` : 'World age: tick-based timeline');
  text('#footer-population', `Players: ${clientState.regions.length > 0 ? 'Online' : '--'}`);
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
    const [reg, hist, tickRes] = await Promise.all([
      api('GET', '/world/regions'),
      api('GET', '/world/history'),
      api('GET', '/world/tick')
    ]);
    setWorldState(reg.data.regions, hist.data.events, tickRes.data.tick, true);
  } catch {
    setWorldState([], [], null, false);
  }
}
