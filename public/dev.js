const statusEl = document.querySelector('#dev-status');
const ticksEl = document.querySelector('#dev-ticks');
const actionsEl = document.querySelector('#action-stats');
const historyEl = document.querySelector('#dev-history');
const summaryCards = document.querySelector('#summary-cards');
const systemStats = document.querySelector('#system-stats');
const replayOutput = document.querySelector('#replay-output');

async function fetchJson(url) {
  const res = await fetch(url);
  return { ok: res.ok, data: await res.json() };
}

function renderList(target, rows, formatter) {
  target.replaceChildren(
    ...rows.map(row => {
      const item = document.createElement('li');
      item.textContent = formatter(row);
      return item;
    })
  );
}

function summaryCard(label, value, sub) {
  const card = document.createElement('div');
  card.className = 'stat-card';
  card.innerHTML = `<div class="stat-label">${label}</div><div class="value">${value}</div>${sub ? `<div style="font-size:12px;color:var(--muted)">${sub}</div>` : ''}`;
  return card;
}

function renderSummary(summary) {
  summaryCards.replaceChildren(
    summaryCard('Accounts', summary.accounts),
    summaryCard('Characters', `${summary.characters.active} / ${summary.characters.total}`, 'active / total'),
    summaryCard('Groups', `${summary.groups.active} / ${summary.groups.total}`, 'active / total'),
    summaryCard('Settlements', `${summary.settlements.active} / ${summary.settlements.total}`, 'active / total'),
    summaryCard('Structures', `${summary.structures.completed} / ${summary.structures.total}`, 'completed / total'),
    summaryCard('Sessions', `${summary.sessions.active} / ${summary.sessions.total}`, 'active / total'),
    summaryCard('Avg Tick', `${summary.avgTickDurationMs}ms`, 'duration'),
    summaryCard('Current Tick', summary.currentTick?.tick_number ?? '—', summary.currentTick?.status ?? 'no tick data')
  );
}

function renderSystems(systems) {
  systemStats.replaceChildren(
    ...systems.map(sys => {
      const div = document.createElement('div');
      div.className = 'system-bar';
      div.innerHTML = `
        <span class="system-name">${sys.system_name}</span>
        <span>${sys.runs} runs | ${sys.avg_duration_ms}ms avg | ${sys.avg_processed} proc | ${sys.total_events} events</span>
      `;
      return div;
    })
  );
}

function renderActionCounts(actions) {
  if (!actions || actions.length === 0) {
    actionsEl.textContent = 'No actions in queue.';
    return;
  }
  actionsEl.replaceChildren(
    ...actions.map(a => {
      const div = document.createElement('div');
      div.className = 'action-row';
      const badge = document.createElement('span');
      badge.className = `action-badge badge-${a.status}`;
      badge.textContent = a.status;
      div.append(badge, ` ${a.count} action(s)`);
      return div;
    })
  );
}

function renderTicks(ticks) {
  ticksEl.replaceChildren(
    ...ticks.map(t => {
      const item = document.createElement('li');
      item.className = `tick-row ${t.status === 'completed' ? 'ok' : 'fail'}`;
      item.textContent = `Tick ${t.tick_number} | ${t.status} | day ${t.game_day ?? '—'} | ${t.duration_ms ?? '—'}ms | ${t.started_at ? new Date(t.started_at).toLocaleTimeString() : ''}`;
      return item;
    })
  );
}

function renderHistory(events) {
  historyEl.replaceChildren(
    ...events.slice(0, 15).map(e => {
      const item = document.createElement('li');
      item.className = 'tick-row';
      item.textContent = `${e.tick_number ?? '—'} | ${e.event_type} | ${e.summary}`;
      return item;
    })
  );
}

async function loadDevState() {
  try {
    const { ok, data } = await fetchJson('/dev/state');
    if (!ok) { statusEl.textContent = data.error ?? 'Dev state unavailable.'; return; }

    statusEl.textContent = `Live — Last updated: ${new Date().toLocaleTimeString()}`;
    renderSummary(data.summary);
    renderSystems(data.systems);
    renderActionCounts(data.actions);
    renderTicks(data.ticks);
    renderHistory(data.history);

    // Load system performance separately
    const sysRes = await fetchJson('/dev/systems');
    if (sysRes.ok) renderSystems(sysRes.data.systems);
  } catch {
    statusEl.textContent = 'Dev state unavailable.';
  }
}

async function loadReplay() {
  const from = document.querySelector('#replay-from').value;
  const to = document.querySelector('#replay-to').value;
  const limit = document.querySelector('#replay-limit').value || 100;
  const params = new URLSearchParams();
  if (from) params.set('fromTick', from);
  if (to) params.set('toTick', to);
  params.set('limit', limit);

  replayOutput.textContent = 'Loading...';
  try {
    const { ok, data } = await fetchJson(`/dev/replay?${params}`);
    if (!ok) { replayOutput.textContent = data.error ?? 'Replay failed.'; return; }
    replayOutput.textContent = data.events.length === 0
      ? 'No events in range.'
      : JSON.stringify(data.events, null, 2);
  } catch {
    replayOutput.textContent = 'Replay unavailable.';
  }
}

async function cleanupSessions() {
  try {
    const res = await fetch('/dev/cleanup-sessions', { method: 'POST' });
    const data = await res.json();
    statusEl.textContent = `Cleaned up ${data.deleted} expired sessions.`;
    loadDevState();
  } catch {
    statusEl.textContent = 'Session cleanup failed.';
  }
}

document.querySelector('#refresh-btn')?.addEventListener('click', loadDevState);
document.querySelector('#replay-btn')?.addEventListener('click', loadReplay);
document.querySelector('#cleanup-sessions-btn')?.addEventListener('click', cleanupSessions);

loadDevState();
window.setInterval(loadDevState, 5000);
