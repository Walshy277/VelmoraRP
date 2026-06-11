const clientState = { calendar: null, regions: [], events: [], apiOnline: false };

export function getClientState() { return clientState; }

export function setWorldState(calendar, regions, events, online) {
  clientState.calendar = calendar;
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
  renderDerivedWorldState();
  renderHistory();
  renderWorldNews();
  renderActiveEvents();
}

export async function loadWorldState() {
  const { api } = await import('./api.js');
  try {
    const [cal, reg, hist] = await Promise.all([
      api('GET', '/world/calendar'),
      api('GET', '/world/regions'),
      api('GET', '/world/history')
    ]);
    setWorldState(cal.data.calendar, reg.data.regions, hist.data.events, true);
  } catch {
    setWorldState(null, [], [], false);
  }
}
