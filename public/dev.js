import { api } from './components/api.js';
import { toast } from './components/toast.js';

let allCharacters = [];
let accountInfo = null;

async function init() {
  document.getElementById('refresh-btn').addEventListener('click', loadDashboard);
  document.getElementById('spawn-btn').addEventListener('click', spawnItems);
  document.getElementById('modify-btn').addEventListener('click', modifyCharacter);
  document.getElementById('force-action-btn').addEventListener('click', forceAction);
  document.getElementById('force-tick-btn').addEventListener('click', forceTick);
  document.getElementById('broadcast-btn').addEventListener('click', sendBroadcast);
  document.getElementById('replay-btn').addEventListener('click', loadReplay);
  document.getElementById('cleanup-sessions-btn').addEventListener('click', cleanupSessions);

  await loadDashboard();
}

async function loadDashboard() {
  const statusEl = document.getElementById('cp-status');
  statusEl.textContent = 'Loading...';

  try {
    const meResult = await api('GET', '/dev/me');
    if (!meResult.ok) {
      statusEl.textContent = 'Access denied: You are not the Creator.';
      return;
    }
    accountInfo = meResult.data.account;
    document.getElementById('cp-identity').textContent = `${accountInfo.displayName} (${accountInfo.email})`;

    const [stateResult, charsResult] = await Promise.all([
      api('GET', '/dev/state'),
      api('GET', '/dev/characters')
    ]);

    if (!stateResult.ok) throw new Error('Failed to load state');
    if (!charsResult.ok) throw new Error('Failed to load characters');

    renderSummary(stateResult.data);
    renderSystems(stateResult.data);
    renderActions(stateResult.data);
    renderTicks(stateResult.data);
    renderHistory(stateResult.data);

    allCharacters = charsResult.data.characters;
    populateCharacterSelects();

    statusEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}

function renderSummary(data) {
  const s = data.summary;
  document.getElementById('summary-cards').innerHTML = `
    <div class="stat-card">
      <div class="value">${s.accounts}</div>
      <div class="stat-label">Accounts</div>
    </div>
    <div class="stat-card">
      <div class="value">${s.characters.active} <span style="font-size:14px;color:var(--muted)">/ ${s.characters.total}</span></div>
      <div class="stat-label">Characters (active / total)</div>
    </div>
    <div class="stat-card">
      <div class="value">${s.groups.active} <span style="font-size:14px;color:var(--muted)">/ ${s.groups.total}</span></div>
      <div class="stat-label">Groups (active / total)</div>
    </div>
    <div class="stat-card">
      <div class="value">${s.settlements.active} <span style="font-size:14px;color:var(--muted)">/ ${s.settlements.total}</span></div>
      <div class="stat-label">Settlements (active / total)</div>
    </div>
    <div class="stat-card">
      <div class="value">${s.structures.completed} <span style="font-size:14px;color:var(--muted)">/ ${s.structures.total}</span></div>
      <div class="stat-label">Structures (built / total)</div>
    </div>
    <div class="stat-card">
      <div class="value">${s.sessions.active} <span style="font-size:14px;color:var(--muted)">/ ${s.sessions.total}</span></div>
      <div class="stat-label">Sessions (active / total)</div>
    </div>
    <div class="stat-card">
      <div class="value">${data.currentTick ? `#${data.currentTick.tick_number}` : '—'}</div>
      <div class="stat-label">Current Tick</div>
    </div>
    <div class="stat-card">
      <div class="value">${data.currentTick ? data.currentTick.status : '—'}</div>
      <div class="stat-label">Tick Status</div>
    </div>
    <div class="stat-card">
      <div class="value">${s.avgTickDurationMs}ms</div>
      <div class="stat-label">Avg Tick Duration</div>
    </div>
  `;
}

function renderSystems(data) {
  const el = document.getElementById('system-stats');
  if (!data.systems || data.systems.length === 0) {
    el.innerHTML = '<span class="muted">No system runs recorded.</span>';
    return;
  }
  el.innerHTML = data.systems.map(sys => {
    const pct = sys.runs > 0 && data.ticks.length > 0
      ? Math.round((sys.runs / Math.max(...data.ticks.map(t => t.tick_number))) * 100)
      : 0;
    return `<div class="system-bar">
      <span class="system-name">${sys.system_name}</span>
      <span>${sys.runs} runs &middot; ${sys.avg_duration_ms}ms avg &middot; ${sys.total_events} events</span>
    </div>`;
  }).join('');
}

function renderActions(data) {
  const el = document.getElementById('action-stats');
  if (!data.actions || data.actions.length === 0) {
    el.innerHTML = '<span class="muted">No actions queued.</span>';
    return;
  }
  el.innerHTML = data.actions.map(a => {
    const badgeClass = `badge-${a.status}`;
    return `<div class="action-row">
      <span class="action-badge ${badgeClass}">${a.status}</span>
      <span style="flex:1">${a.action_type}</span>
      <span style="color:var(--muted);font-size:11px">
        ${a.count ?? 1}
      </span>
    </div>`;
  }).join('');
}

function renderTicks(data) {
  const el = document.getElementById('dev-ticks');
  if (!data.ticks || data.ticks.length === 0) {
    el.innerHTML = '<li class="muted">No ticks yet.</li>';
    return;
  }
  el.innerHTML = data.ticks.map(t => `
    <li class="tick-row ${t.status === 'completed' ? 'ok' : 'fail'}">
      <span>#${t.tick_number}</span>
      <span>${t.status}</span>
      <span>${t.duration_ms ? t.duration_ms + 'ms' : '—'}</span>
      <span style="font-size:11px;color:var(--muted)">
        ${t.started_at ? new Date(t.started_at).toLocaleTimeString() : ''}
      </span>
    </li>
  `).join('');
}

function renderHistory(data) {
  const el = document.getElementById('dev-history');
  if (!data.history || data.history.length === 0) {
    el.innerHTML = '<li class="muted">No historical events.</li>';
    return;
  }
  el.innerHTML = data.history.slice(0, 15).map(h => `
    <li class="tick-row">
      <span>${h.summary || h.event_type}</span>
      <span style="font-size:11px;color:var(--muted)">
        ${h.created_at ? new Date(h.created_at).toLocaleTimeString() : ''}
      </span>
    </li>
  `).join('');
}

function populateCharacterSelects() {
  const selects = ['spawn-char', 'modify-char', 'force-char'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = allCharacters.map(c =>
      `<option value="${c.id}">${c.name} (${c.status}, ${c.regionName ?? '?'})</option>`
    ).join('');
  });
}

async function spawnItems() {
  const characterId = document.getElementById('spawn-char').value;
  const rawItems = document.getElementById('spawn-items-json').value;
  const resultEl = document.getElementById('spawn-result');
  resultEl.textContent = '';

  try {
    const items = JSON.parse(rawItems);
    if (typeof items !== 'object' || Object.keys(items).length === 0) {
      throw new Error('Items must be a non-empty JSON object');
    }
    const { ok, data } = await api('POST', '/dev/spawn-items', { characterId, items });
    if (!ok) throw new Error(data.error || 'Spawn failed');
    resultEl.textContent = `Spawned ${Object.entries(data.spawned).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
    toast('Items spawned!', 'success');
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

async function modifyCharacter() {
  const characterId = document.getElementById('modify-char').value;
  const health = document.getElementById('modify-health').value;
  const status = document.getElementById('modify-status').value;
  const resultEl = document.getElementById('modify-result');
  resultEl.textContent = '';

  const body = { characterId };
  if (health !== '') body.health = parseInt(health, 10);
  if (status !== '') body.status = status;

  if (Object.keys(body).length === 1) {
    resultEl.textContent = 'Select at least one field to change.';
    return;
  }

  try {
    const { ok, data } = await api('POST', '/dev/modify-character', body);
    if (!ok) throw new Error(data.error || 'Modify failed');
    resultEl.textContent = `Updated ${data.character.name}: ${data.character.status}, health ${data.character.health}`;
    toast('Character modified!', 'success');
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

async function forceAction() {
  const characterId = document.getElementById('force-char').value;
  const actionType = document.getElementById('force-action-type').value;
  const rawPayload = document.getElementById('force-payload').value;
  const resultEl = document.getElementById('force-action-result');
  resultEl.textContent = '';

  try {
    const payload = JSON.parse(rawPayload);
    const { ok, data } = await api('POST', '/dev/force-action', { characterId, actionType, payload });
    if (!ok) throw new Error(data.error || 'Force action failed');
    resultEl.textContent = `Action queued (id: ${data.id})`;
    toast('Action forced!', 'success');
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

async function forceTick() {
  const resultEl = document.getElementById('force-tick-result');
  resultEl.textContent = 'Forcing tick...';
  try {
    const { ok, data } = await api('POST', '/dev/force-tick');
    if (!ok) throw new Error(data.error || 'Force tick failed');
    resultEl.textContent = `Tick #${data.tickNumber} triggered (${data.status})`;
    toast('Tick forced!', 'success');
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

async function sendBroadcast() {
  const message = document.getElementById('broadcast-msg').value.trim();
  const resultEl = document.getElementById('broadcast-result');
  resultEl.textContent = '';
  if (!message) { resultEl.textContent = 'Enter a message.'; return; }
  try {
    const { ok, data } = await api('POST', '/dev/broadcast', { message });
    if (!ok) throw new Error(data.error || 'Broadcast failed');
    resultEl.textContent = 'Broadcast sent!';
    document.getElementById('broadcast-msg').value = '';
    toast('Broadcast sent!', 'success');
  } catch (err) {
    resultEl.textContent = `Error: ${err.message}`;
  }
}

async function loadReplay() {
  const from = document.getElementById('replay-from').value;
  const to = document.getElementById('replay-to').value;
  const limit = document.getElementById('replay-limit').value || 100;
  const outputEl = document.getElementById('replay-output');

  const params = new URLSearchParams();
  if (from) params.set('fromTick', from);
  if (to) params.set('toTick', to);
  params.set('limit', String(limit));

  outputEl.textContent = 'Loading...';
  try {
    const { ok, data } = await api('GET', `/dev/replay?${params.toString()}`);
    if (!ok) throw new Error(data.error || 'Replay load failed');
    const lines = data.events.map((e, i) =>
      `[${e.tick_number}] ${e.event_type}: ${e.summary || JSON.stringify(e.payload)}`
    ).join('\n');
    outputEl.textContent = lines || 'No events found.';
  } catch (err) {
    outputEl.textContent = `Error: ${err.message}`;
  }
}

async function cleanupSessions() {
  try {
    const { ok, data } = await api('POST', '/dev/cleanup-sessions');
    if (!ok) throw new Error(data.error || 'Cleanup failed');
    toast(`Cleaned up ${data.deleted} expired sessions`, 'success');
    loadDashboard();
  } catch (err) {
    toast(`Cleanup error: ${err.message}`, 'error');
  }
}

init();
