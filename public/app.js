import { saveSession, clearSession, loadMyCharacters, renderAuthUI, handleRegister, handleLogin, handleLogout, createCharacter, onAuthChange, getSessionAccount, getMyCharacters, getActiveCharacterId } from './components/auth.js';
import { setRegions, startMap, resizeCanvas, enableMapTouch } from './components/map.js';
import { loadWorldState, getClientState, renderHeroPanel } from './components/render.js';
import { wireActionButtons, resetPendingCount } from './components/actions.js';
import { toast } from './components/toast.js';
import { api } from './components/api.js';

/* ---- Tutorial ---- */
function initTutorial() {
  const dialog = document.querySelector('#tutorial-dialog');
  const prevBtn = document.querySelector('#tutorial-prev');
  const nextBtn = document.querySelector('#tutorial-next');
  const doneBtn = document.querySelector('#tutorial-done');
  const dots = document.querySelectorAll('.dot');
  let step = 1;
  const totalSteps = 3;

  function showStep(s) {
    for (let i = 1; i <= totalSteps; i++) {
      const el = document.querySelector(`#tutorial-step-${i}`);
      if (el) el.style.display = i === s ? '' : 'none';
    }
    dots.forEach((dot, i) => dot.classList.toggle('active', i === s - 1));
    prevBtn.disabled = s === 1;
    nextBtn.style.display = s < totalSteps ? '' : 'none';
    doneBtn.style.display = s === totalSteps ? '' : 'none';
  }

  const hasSeenTutorial = localStorage.getItem('velmora_tutorial_seen');

  if (!hasSeenTutorial) {
    setTimeout(() => {
      showStep(1);
      dialog.showModal();
    }, 500);
  }

  prevBtn.addEventListener('click', () => {
    if (step > 1) { step--; showStep(step); }
  });
  nextBtn.addEventListener('click', () => {
    if (step < totalSteps) { step++; showStep(step); }
  });
  doneBtn.addEventListener('click', () => {
    localStorage.setItem('velmora_tutorial_seen', 'true');
    dialog.close();
  });
}

/* ---- Bottom Navigation ---- */
function initBottomNav() {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      if (view === 'map') {
        const canvas = document.querySelector('#world-canvas');
        if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelector('#view-home')?.style ? document.querySelector('#view-home').style.display = '' : null;
        document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
        if (document.querySelector('#view-home')) document.querySelector('#view-home').style.display = '';
        const home = document.querySelector('#view-home');
        if (home) { home.style.display = ''; window.location.hash = ''; }
        setTimeout(() => canvas?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        return;
      }
      document.querySelectorAll('.bottom-nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      window.location.hash = view;
    });
  });
}

function updateBottomNav(hash) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === hash || (!hash && item.dataset.view === 'home'));
  });
}

/* ---- Auth ---- */
onAuthChange(() => {
  renderAuthUI();
  renderHeroPanel();
});

document.querySelector('#register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const result = await handleRegister(fd.get('email'), fd.get('displayName'), fd.get('password'));
  const status = document.querySelector('#auth-result');
  if (!result.ok) {
    status.textContent = result.error;
    toast(result.error, 'error');
    return;
  }
  toast(`Welcome, ${result.data.account.displayName}! Account created and logged in.`, 'success');
  status.textContent = 'Logged in.';
  e.target.reset();
  await loadWorldState();
});

document.querySelector('#login-submit')?.addEventListener('click', async () => {
  const email = document.querySelector('#email')?.value;
  const password = document.querySelector('#password')?.value;
  if (!email || !password) { toast('Enter email and password.', 'error'); return; }
  const status = document.querySelector('#auth-result');
  status.textContent = 'Logging in...';
  const result = await handleLogin(email, password);
  if (!result.ok) {
    status.textContent = result.error;
    toast(result.error, 'error');
    return;
  }
  toast(`Welcome, ${result.data.account.displayName}!`, 'success');
  status.textContent = 'Logged in.';
  const emailEl = document.querySelector('#email');
  const passEl = document.querySelector('#password');
  const nameEl = document.querySelector('#display-name');
  if (emailEl) emailEl.value = '';
  if (passEl) passEl.value = '';
  if (nameEl) nameEl.value = '';
  await loadWorldState();
});

document.querySelector('#logout-button')?.addEventListener('click', async () => {
  await handleLogout();
  toast('Logged out.', 'info');
  loadWorldState();
});

/* ---- Character Dialog ---- */
const charDialog = document.querySelector('#character-dialog');
document.querySelector('#show-create-character')?.addEventListener('click', () => {
  const nameEl = document.querySelector('#character-name');
  if (nameEl) nameEl.value = '';
  if (charDialog) charDialog.showModal();
});
document.querySelector('#character-cancel')?.addEventListener('click', () => { if (charDialog) charDialog.close(); });
document.querySelector('#enter-world-button')?.addEventListener('click', async () => {
  const name = document.querySelector('#character-name')?.value?.trim();
  const focus = document.querySelector('#character-focus')?.value || 'survivor';
  if (!name) { toast('Enter a name for your character.', 'error'); return; }
  const btn = document.querySelector('#enter-world-button');
  btn.disabled = true;
  btn.textContent = 'Entering...';
  try {
    const result = await createCharacter(name, focus);
    if (result.ok) {
      toast(`Character ${result.data.character.name} created with ${focus} focus!`, 'success');
      if (charDialog) charDialog.close();
    } else {
      toast(result.data?.error || 'Failed to create character', 'error');
    }
  } catch (err) {
    toast('Could not reach the world. Is the server running?', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enter the World';
  }
});

/* ---- Map Reset ---- */
document.querySelector('#map-reset-button')?.addEventListener('click', () => {
  toast('Map centered.', 'info');
});

/* ---- Primary Nav ---- */
document.querySelector('.primary-nav')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (!btn) return;
  e.preventDefault();
  const view = btn.dataset.view;
  if (view === 'map') {
    const canvas = document.querySelector('#world-canvas');
    if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelectorAll('.view-section').forEach(s => s.style.display = 'none');
    const home = document.querySelector('#view-home');
    if (home) home.style.display = '';
    window.location.hash = '';
    return;
  }
  window.location.hash = view;
});

/* ---- Navigation ---- */
function navigateToView(hash) {
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(s => s.style.display = 'none');
  if (!hash || hash === 'home') {
    const home = document.querySelector('#view-home');
    if (home) home.style.display = '';
    updateBottomNav('home');
    return;
  }
  const target = document.querySelector(`#view-${hash}`);
  if (target) target.style.display = '';
  updateBottomNav(hash);
}

/* ---- View Loaders ---- */
function smallBar(pct, color) {
  return `<div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100, pct)}%;background:${color}"></div></div>`;
}

function makeCharCard(c) {
  const injuryWarning = c.injuries?.length > 0
    ? `<div class="injury-bar">Injuries: ${c.injuries.map(i => `<span class="injury-tag">${i.kind} (${i.severity})</span>`).join(', ')}</div>`
    : '<div class="injury-bar" style="color:var(--good)">No injuries</div>';

  const r = c.resources || {};
  const s = c.stats || {};
  const healthColor = c.health > 50 ? 'var(--good)' : c.health > 25 ? '#c8a040' : '#c66';

  return `<div class="char-card">
    <div class="char-card-header">
      <strong class="char-name">${c.name}</strong>
      <span class="char-status status-${c.status}">${c.status}</span>
    </div>
    <div class="char-card-body">
      <div class="char-stat-row"><span>Health</span><span>${c.health}/100</span></div>
      <div style="grid-column:1/-1">${smallBar(c.health, healthColor)}</div>
      <div class="char-stat-row"><span>Vigor</span><span>${r.vigor || '?'}/${r.maxVigor || '?'}</span></div>
      <div class="char-stat-row"><span>Focus</span><span>${r.focus || '?'}/${r.maxFocus || '?'}</span></div>
      <div class="char-stat-row"><span>Morale</span><span>${r.morale || '?'}/${r.maxMorale || '?'}</span></div>
      <div class="char-stat-row"><span>Saturation</span><span>${r.saturation || '?'}/${r.maxSaturation || '?'}</span></div>
      <div class="char-stat-row"><span>Age</span><span>${c.ageDays} days</span></div>
      <div class="char-stat-row"><span>Region</span><span>${c.regionName || c.regionId}</span></div>
      <div class="char-stat-row"><span>Stats</span><span>M:${s.might || 0} F:${s.fortitude || 0} D:${s.dexterity || 0} I:${s.intellect || 0} C:${s.cunning || 0} P:${s.presence || 0}</span></div>
      <div style="grid-column:1/-1">${injuryWarning}</div>
    </div>
    <div class="char-card-footer">
      <button class="secondary-button set-active-btn" data-char-id="${c.id}" data-char-name="${c.name}">Set Active</button>
    </div>
  </div>`;
}

function makeInvenGrid(items) {
  if (!items || Object.keys(items).length === 0) return '<p class="status-text">Inventory is empty.</p>';
  const entries = Object.entries(items).filter(([, v]) => Number(v) > 0);
  if (entries.length === 0) return '<p class="status-text">Inventory is empty.</p>';
  return `<div class="inventory-grid">${
    entries.map(([item, qty]) =>
      `<div class="inv-item"><span class="inv-name">${item}</span><span class="inv-qty">${qty}</span></div>`
    ).join('')
  }</div>`;
}

function makeKnowledgeTags(knowledge) {
  if (!knowledge || knowledge.length === 0) return '<p class="status-text">No knowledge learned yet.</p>';
  return `<div class="knowledge-tags">${
    knowledge.map(k => `<span class="knowledge-tag">${k.name} <em>${k.proficiency}%</em></span>`).join('')
  }</div>`;
}

function renderRecentActions(actions) {
  if (!actions || actions.length === 0) return '<p class="status-text">No recent actions.</p>';
  return `<div class="action-history">${
    actions.slice(0, 8).map(a =>
      `<div class="action-row"><span class="action-type">${a.action_type}</span><span class="action-meta">${a.status}${a.rejection_reason ? `: ${a.rejection_reason}` : ''}</span></div>`
    ).join('')
  }</div>`;
}

async function loadCharacterView() {
  const container = document.querySelector('#character-view-content');
  if (!container) return;
  const { ok, data } = await api('GET', '/characters/my');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load characters.</p>'; return; }
  const chars = data.characters || [];
  if (chars.length === 0) {
    container.innerHTML = '<p class="status-text">No character yet. Create one from the home screen.</p>';
    return;
  }

  container.innerHTML = chars.map(makeCharCard).join('');

  container.querySelectorAll('.set-active-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.charId;
      const name = btn.dataset.charName;
      localStorage.setItem('velmora_active_character', id);
      toast(`Active character set to ${name}`, 'info');
      loadCharacterView();
    });
  });

  const activeChar = chars.find(c => c.id === getActiveCharacterId()) || chars[0];

  const invContainer = document.querySelector('#inventory-view-content');
  if (invContainer) invContainer.innerHTML = makeInvenGrid(activeChar?.inventory);

  const knowContainer = document.querySelector('#knowledge-view-content');
  if (knowContainer) knowContainer.innerHTML = makeKnowledgeTags(activeChar?.knowledge);

  const actionsContainer = document.querySelector('#actions-view-content');
  if (actionsContainer) actionsContainer.innerHTML = renderRecentActions(activeChar?.recentActions);
}

async function loadInventoryView() {
  const container = document.querySelector('#inventory-view-content');
  if (!container) return;
  const { ok, data } = await api('GET', '/characters/my');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load.</p>'; return; }
  const chars = data.characters || [];
  const activeChar = chars.find(c => c.id === getActiveCharacterId()) || chars[0];
  container.innerHTML = makeInvenGrid(activeChar?.inventory);
}

async function loadKnowledgeView() {
  const container = document.querySelector('#knowledge-view-content');
  if (!container) return;
  const { ok, data } = await api('GET', '/characters/my');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load.</p>'; return; }
  const chars = data.characters || [];
  const activeChar = chars.find(c => c.id === getActiveCharacterId()) || chars[0];
  container.innerHTML = makeKnowledgeTags(activeChar?.knowledge);
}

async function loadFamilyView() {
  const container = document.querySelector('#family-view-content');
  if (!container) return;

  const { ok, data } = await api('GET', '/characters/my');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load character data.</p>'; return; }
  const chars = data.characters || [];
  if (chars.length === 0) {
    container.innerHTML = '<p class="status-text">Create a character first. Your bloodline begins with you.</p>';
    return;
  }

  const activeChar = chars.find(c => c.id === getActiveCharacterId()) || chars[0];
  if (!activeChar.lineageId) {
    container.innerHTML = '<p class="status-text">No lineage established. Your character stands alone.</p>';
    return;
  }

  const lineageRes = await api('GET', `/world/lineages/${activeChar.lineageId}`);
  if (!lineageRes.ok) { container.innerHTML = '<p class="status-text">Could not load lineage data.</p>'; return; }

  const lineage = lineageRes.data.lineage;
  const members = lineage.members || [];
  const founder = lineage.founder;

  container.innerHTML = `
    <div class="lineage-card">
      <h2 style="margin:0 0 4px;color:var(--gold-soft)">${lineage.familyName}</h2>
      <p style="margin:0 0 8px;color:var(--muted);font-size:13px">Founded ${new Date(lineage.foundedAt).toLocaleDateString()}${founder ? ` by ${founder.name}` : ''}</p>
      <p style="margin:0;font-size:13px;color:var(--muted)">Members: ${members.length}</p>
    </div>
    <h3 style="margin:12px 0 6px;color:var(--gold);font-size:14px;text-transform:uppercase">Bloodline Members</h3>
    <div class="lineage-members">${
      members.length === 0
        ? '<p class="status-text">No other members in this lineage yet.</p>'
        : members.map(m => `
          <div class="lineage-member ${m.id === activeChar.id ? 'current-char' : ''}">
            <strong>${m.name}${m.id === activeChar.id ? ' (you)' : ''}</strong>
            <span style="font-size:12px;color:var(--muted)">${m.status} — ${m.region_name || 'Unknown region'}</span>
          </div>
        `).join('')
    }</div>
  `;
}

async function loadSocietyView() {
  const container = document.querySelector('#society-view-content');
  if (!container) return;

  const [groupsRes, settlementsRes, charsRes, structRes, terrRes] = await Promise.all([
    api('GET', '/world/groups'),
    api('GET', '/world/settlements'),
    api('GET', '/world/characters'),
    api('GET', '/world/structures'),
    api('GET', '/world/territory')
  ]);

  const groups = groupsRes.ok ? (groupsRes.data.groups || []) : [];
  const settlements = settlementsRes.ok ? (settlementsRes.data.settlements || []) : [];
  const chars = charsRes.ok ? (charsRes.data.characters || []) : [];
  const structures = structRes.ok ? (structRes.data.structures || []) : [];
  const territory = terrRes.ok ? (terrRes.data.territory || []) : [];

  container.innerHTML = `
    <div class="society-summary">
      <span>Groups: <strong>${groups.length}</strong></span>
      <span>Settlements: <strong>${settlements.length}</strong></span>
      <span>Characters: <strong>${chars.length}</strong></span>
      <span>Structures: <strong>${structures.length}</strong></span>
      <span>Claims: <strong>${territory.length}</strong></span>
    </div>
  `;

  const groupsContainer = document.querySelector('#groups-view-content');
  if (groupsContainer) {
    if (groups.length === 0) {
      groupsContainer.innerHTML = '<p class="status-text">No groups formed yet. Unite with others to form the first bonds.</p>';
    } else {
      groupsContainer.innerHTML = groups.map(g => `
        <div class="society-item">
          <strong>${g.name}</strong>
          <div class="society-item-meta">${g.type} &middot; ${g.member_count} member${g.member_count !== 1 ? 's' : ''}</div>
          ${g.description ? `<div class="society-item-desc">${g.description}</div>` : ''}
        </div>
      `).join('');
    }
  }

  const settlementsContainer = document.querySelector('#settlements-view-content');
  if (settlementsContainer) {
    if (settlements.length === 0) {
      settlementsContainer.innerHTML = '<p class="status-text">No settlements founded yet. Claim land and build the first home.</p>';
    } else {
      settlementsContainer.innerHTML = settlements.map(s => `
        <div class="society-item">
          <strong>${s.name}</strong>
          <div class="society-item-meta">${s.region_name || 'Unknown region'}${s.controlling_group_name ? ` &middot; ${s.controlling_group_name}` : ''}</div>
        </div>
      `).join('');
    }
  }

  const structContainer = document.querySelector('#structures-view-content');
  if (structContainer) {
    if (structures.length === 0) {
      structContainer.innerHTML = '<p class="status-text">No structures built yet.</p>';
    } else {
      structContainer.innerHTML = structures.map(s => `
        <div class="society-item">
          <strong>${s.kind}</strong>
          <div class="society-item-meta">${s.region_name || ''}${s.settlement_name ? ` &middot; ${s.settlement_name}` : ''}${s.completed_at ? ' &middot; Completed' : ` &middot; ${Math.round(s.construction_progress)}%`}</div>
        </div>
      `).join('');
    }
  }
}

async function loadKnowledgeTreeView() {
  const container = document.querySelector('#knowledge-tree-content');
  if (!container) return;
  const { ok, data } = await api('GET', '/world/knowledge');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load knowledge.</p>'; return; }
  const entries = data.knowledge || [];
  if (entries.length === 0) {
    container.innerHTML = '<p class="status-text">No knowledge has been discovered yet.</p>';
    return;
  }

  const byCategory = {};
  for (const k of entries) {
    const cat = k.category || 'uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(k);
  }

  container.innerHTML = Object.entries(byCategory).map(([cat, items]) => `
    <div class="knowledge-category">
      <h3 style="margin:0 0 6px;color:var(--gold);font-size:14px;text-transform:uppercase">${cat}</h3>
      <div class="knowledge-items">${items.map(k => `
        <div class="knowledge-entry">
          <strong>${k.name || k.label}</strong>
          ${k.description ? `<span class="knowledge-desc">${k.description}</span>` : ''}
        </div>
      `).join('')}</div>
    </div>
  `).join('');
}

async function loadCultureView() {
  const container = document.querySelector('#culture-view-content');
  if (!container) return;

  const [groupsRes, charsRes, eventsRes] = await Promise.all([
    api('GET', '/world/groups'),
    api('GET', '/world/characters'),
    api('GET', '/world/history')
  ]);

  const groups = groupsRes.ok ? (groupsRes.data.groups || []) : [];
  const chars = charsRes.ok ? (charsRes.data.characters || []) : [];
  const events = eventsRes.ok ? (eventsRes.data.events || []) : [];

  if (groups.length === 0 && chars.length === 0) {
    container.innerHTML = `
      <p class="status-text">The cultural encyclopedia awaits the first civilizations.
      Traditions, religions, and customs will be recorded here as societies develop.</p>
    `;
    return;
  }

  const eventCount = events.length;

  container.innerHTML = `
    <div class="culture-summary">
      ${groups.length > 0 ? `<div class="culture-stat"><span>Active Groups</span><strong>${groups.length}</strong></div>` : ''}
      ${chars.length > 0 ? `<div class="culture-stat"><span>Total Characters</span><strong>${chars.length}</strong></div>` : ''}
      ${eventCount > 0 ? `<div class="culture-stat"><span>Historical Events</span><strong>${eventCount}</strong></div>` : ''}
    </div>
    ${groups.length > 0 ? `
      <h3 style="margin:12px 0 6px;color:var(--gold);font-size:14px;text-transform:uppercase">Emerging Societies</h3>
      <div class="culture-groups">${groups.map(g => `
        <div class="culture-group">
          <strong>${g.name}</strong>
          <span style="font-size:12px;color:var(--muted)">${g.type} &middot; ${g.member_count} member${g.member_count !== 1 ? 's' : ''}</span>
        </div>
      `).join('')}</div>
    ` : ''}
  `;
}

async function loadTradeView() {
  const container = document.querySelector('#trade-view-content');
  if (!container) return;

  const [relRes, groupsRes] = await Promise.all([
    api('GET', '/world/relationships'),
    api('GET', '/world/groups')
  ]);

  const relationships = relRes.ok ? (relRes.data.relationships || []) : [];
  const groups = groupsRes.ok ? (groupsRes.data.groups || []) : [];

  if (relationships.length === 0 && groups.length === 0) {
    container.innerHTML = '<p class="status-text">No trade routes or external relationships established yet. Form groups and interact with others to open commerce.</p>';
    return;
  }

  if (relationships.length === 0) {
    container.innerHTML = `
      <p class="status-text">No diplomatic relationships recorded yet. As groups interact, trade and alliances will appear here.</p>
      ${groups.length > 0 ? `<h3 style="margin:12px 0 6px;color:var(--gold);font-size:14px;text-transform:uppercase">Active Groups (potential trade partners)</h3>
        <div class="trade-groups">${groups.map(g => `
          <div class="trade-group"><strong>${g.name}</strong><span style="font-size:12px;color:var(--muted)">${g.member_count} members</span></div>
        `).join('')}</div>` : ''}
    `;
    return;
  }

  container.innerHTML = `
    <h3 style="margin:0 0 8px;color:var(--gold);font-size:14px;text-transform:uppercase">Inter-Group Relations</h3>
    <div class="relationship-list">${relationships.map(r => {
      const stanceColor = r.stance === 'friendly' || r.stance === 'allied' ? 'var(--good)' : r.stance === 'hostile' || r.stance === 'war' ? '#c66' : 'var(--muted)';
      return `<div class="relationship-row">
        <strong>${r.source_group_name}</strong>
        <span style="color:${stanceColor}">${r.stance}</span>
        <strong>${r.target_group_name}</strong>
        <span style="font-size:12px;color:var(--muted)">Trust: ${r.trust} &middot; Tension: ${r.tension}</span>
      </div>`;
    }).join('')}</div>
  `;
}

async function loadGovernView() {
  const container = document.querySelector('#govern-view-content');
  if (!container) return;

  const [terrRes, groupsRes, myCharsRes] = await Promise.all([
    api('GET', '/world/territory'),
    api('GET', '/world/groups'),
    api('GET', '/characters/my')
  ]);

  const territory = terrRes.ok ? (terrRes.data.territory || []) : [];
  const groups = groupsRes.ok ? (groupsRes.data.groups || []) : [];
  const myChars = myCharsRes.ok ? (myCharsRes.data.characters || []) : [];

  container.innerHTML = '';

  if (groups.length === 0) {
    container.innerHTML += '<p class="status-text">No groups to govern yet. Form a group to establish governance and claim territory.</p>';
  } else {
    container.innerHTML += `
      <h3 style="margin:0 0 8px;color:var(--gold);font-size:14px;text-transform:uppercase">Groups &amp; Governance</h3>
      <div class="govern-groups">${groups.map(g => `
        <div class="govern-group">
          <strong>${g.name}</strong>
          <span style="font-size:12px;color:var(--muted)">${g.type} &middot; ${g.member_count} members</span>
          ${g.governance && Object.keys(g.governance).length > 0 ? `<span style="font-size:12px;color:var(--gold-soft)">Governance: ${JSON.stringify(g.governance)}</span>` : '<span style="font-size:12px;color:var(--muted)">No formal governance</span>'}
        </div>
      `).join('')}</div>
    `;
  }

  if (territory.length === 0) {
    container.innerHTML += '<p class="status-text" style="margin-top:12px">No territorial claims exist. Groups can claim land through settlements and structures.</p>';
  } else {
    container.innerHTML += `
      <h3 style="margin:12px 0 8px;color:var(--gold);font-size:14px;text-transform:uppercase">Territorial Claims</h3>
      <div class="territory-list">${territory.map(t => `
        <div class="territory-row">
          <strong>${t.group_name || 'Unknown group'}</strong>
          <span style="font-size:13px;color:var(--gold-soft)">${t.region_name || 'Unknown region'}</span>
          <span style="font-size:12px;color:var(--muted)">${t.control_type} &middot; Strength: ${Math.round(t.strength)}</span>
        </div>
      `).join('')}</div>
    `;
  }
}

async function loadChronicleView() {
  const container = document.querySelector('#chronicle-view-content');
  if (!container) return;

  const { ok, data } = await api('GET', '/world/history');
  if (!ok) { container.innerHTML = '<p class="status-text">Could not load chronicles.</p>'; return; }

  const events = data.events || [];
  const chronicles = events.filter(e => e.event_type === 'chronicle');

  if (chronicles.length === 0) {
    container.innerHTML = `
      <p class="status-text">No chronicles yet. Be the first to record history for future generations.</p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="chronicle-list">${chronicles.slice(0, 20).map(e => `
      <div class="chronicle-entry">
        <strong>${e.summary}</strong>
        <span style="font-size:12px;color:var(--muted)">${new Date(e.created_at).toLocaleString()}</span>
        ${e.payload?.body ? `<p style="margin:4px 0 0;font-size:13px;color:var(--gold-soft);line-height:1.35">${e.payload.body}</p>` : ''}
      </div>
    `).join('')}</div>
  `;
}

const viewLoaders = {
  character: loadCharacterView,
  family: loadFamilyView,
  society: loadSocietyView,
  learn: loadKnowledgeTreeView,
  culture: loadCultureView,
  trade: loadTradeView,
  govern: loadGovernView,
  chronicle: loadChronicleView
};

function handleRoute() {
  const hash = window.location.hash.replace('#', '');
  navigateToView(hash);
  const loader = viewLoaders[hash];
  if (loader) loader();
}

window.addEventListener('hashchange', handleRoute);

/* ---- Chronicle Form ---- */
document.querySelector('#chronicle-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.querySelector('#chronicle-title')?.value?.trim();
  const body = document.querySelector('#chronicle-body')?.value?.trim();
  const scope = document.querySelector('#chronicle-scope')?.value;
  if (!title || !body) { toast('Enter a title and body for your chronicle.', 'error'); return; }
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Recording...';
  const { ok, data } = await api('POST', '/chronicles', { title, body, scope });
  submitBtn.disabled = false;
  submitBtn.textContent = 'Record Chronicle';
  if (ok) {
    toast('Chronicle recorded for posterity!', 'success');
    e.target.reset();
    loadChronicleView();
  } else {
    toast(data?.error || 'Failed to record chronicle', 'error');
  }
});

/* ---- Init ---- */
renderAuthUI();
loadWorldState();
if (getSessionAccount()) loadMyCharacters();

window.setInterval(async () => {
  await loadWorldState();
  const cs = getClientState();
  setRegions(cs.regions);
  resetPendingCount();
  if (getSessionAccount()) loadMyCharacters();
}, 10000);

wireActionButtons();
window.addEventListener('resize', resizeCanvas);
startMap();
enableMapTouch();

handleRoute();
initTutorial();
initBottomNav();
