import { getSessionToken, getMyCharacters, getActiveCharacterId, submitAction } from './auth.js';
import { api } from './api.js';
import { toast } from './toast.js';

let pendingActionCount = 0;

export function getPendingActionCount() { return pendingActionCount; }

function updatePendingUI() {
  const el = document.querySelector('#pending-actions-count');
  if (!el) return;
  if (pendingActionCount > 0) {
    el.style.display = 'flex';
    el.innerHTML = `<span class="pending-spinner"></span> ${pendingActionCount} action${pendingActionCount > 1 ? 's' : ''} pending — results appear after next tick`;
  } else {
    el.style.display = 'none';
  }
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;margin:0 auto"></span>';
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  }
}

function requireAuth() {
  if (!getSessionToken()) { toast('Log in first.', 'error'); return false; }
  if (!getActiveCharacterId() && getMyCharacters().length === 0) { toast('Create a character first.', 'error'); return false; }
  return true;
}

function navigateTo(view) {
  window.location.hash = view;
}

function wireDialog(dialogId, submitId, cancelId, onSubmit) {
  const dialog = document.querySelector(dialogId);
  const submit = document.querySelector(submitId);
  const cancel = document.querySelector(cancelId);
  if (!dialog || !submit || !cancel) return;
  submit.addEventListener('click', async () => {
    setButtonLoading(submit, true);
    const result = await onSubmit(dialog);
    setButtonLoading(submit, false);
    if (result) dialog.close();
  });
  cancel.addEventListener('click', () => dialog.close());
}

async function findFirstCharacter() {
  const charsRes = await api('GET', '/world/characters');
  if (!charsRes.ok) return null;
  const activeId = getActiveCharacterId();
  const myChars = (charsRes.data.characters || []).filter(c => {
    const acc = JSON.parse(localStorage.getItem('velmora_account') || 'null');
    return acc && c.account_id === acc.id;
  });
  if (activeId) {
    const match = myChars.find(c => c.id === activeId);
    if (match) return match;
  }
  return myChars[0] || null;
}

export function wireActionButtons() {
  wireDialog('#group-dialog', '#group-submit', '#group-cancel', async (dialog) => {
    if (!requireAuth()) return false;
    const name = document.querySelector('#group-name').value.trim();
    const description = document.querySelector('#group-description').value.trim();
    if (!name) { toast('Enter a group name.', 'error'); return false; }
    const { ok, data } = await api('POST', '/groups', { name, description });
    if (ok) { toast(`Group "${name}" formed!`, 'success'); dialog.close(); return true; }
    toast(data?.error || 'Failed to form group', 'error');
    return false;
  });

  wireDialog('#settlement-dialog', '#settlement-submit', '#settlement-cancel', async () => {
    if (!requireAuth()) return false;
    const name = document.querySelector('#settlement-name-input').value.trim();
    if (!name) { toast('Enter a settlement name.', 'error'); return false; }

    const char = await findFirstCharacter();
    if (!char) { toast('No character found.', 'error'); return false; }

    const regionId = char.region_id;
    const { ok, data } = await api('POST', '/settlements', {
      name,
      regionId,
      positionX: char.position_x || 50,
      positionY: char.position_y || 50
    });
    if (ok) { toast(`Settlement "${name}" founded!`, 'success'); return true; }
    toast(data?.error || 'Failed to found settlement', 'error');
    return false;
  });

  wireDialog('#structure-dialog', '#structure-submit', '#structure-cancel', async () => {
    if (!requireAuth()) return false;
    const kind = document.querySelector('#structure-kind').value;
    const char = await findFirstCharacter();
    if (!char) { toast('No character found.', 'error'); return false; }
    const { ok, data } = await api('POST', '/structures', {
      kind,
      regionId: char.region_id,
      positionX: char.position_x || 50,
      positionY: char.position_y || 50
    });
    if (ok) { toast(`Placed a ${kind}!`, 'success'); return true; }
    toast(data?.error || 'Failed to place structure', 'error');
    return false;
  });

  wireDialog('#craft-dialog', '#craft-submit', '#craft-cancel', async () => {
    if (!requireAuth()) return false;
    const recipe = document.querySelector('#craft-recipe').value;
    if (!recipe) { toast('Select a recipe.', 'error'); return false; }
    const result = await submitAction('craft_item', { recipe, characterId: getActiveCharacterId() });
    if (result.ok) { toast(`Crafting ${recipe} queued!`, 'success'); pendingActionCount++; updatePendingUI(); return true; }
    toast(result.data?.error || 'Crafting failed', 'error');
    return false;
  });

  wireDialog('#teach-dialog', '#teach-submit', '#teach-cancel', async () => {
    if (!requireAuth()) return false;
    const knowledge = document.querySelector('#teach-knowledge').value.trim();
    const targetCharacterId = document.querySelector('#teach-target').value.trim();
    if (!knowledge || !targetCharacterId) { toast('Enter knowledge name and target character ID.', 'error'); return false; }
    const result = await submitAction('teach', { knowledge, targetCharacterId, characterId: getActiveCharacterId() });
    if (result.ok) { toast(`Teaching ${knowledge} queued!`, 'success'); pendingActionCount++; updatePendingUI(); return true; }
    toast(result.data?.error || 'Teaching failed', 'error');
    return false;
  });

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const a = btn.dataset.action;

      if (a === 'camp') {
        if (!requireAuth()) return;
        document.querySelector('#structure-kind').value = 'hut';
        document.querySelector('#structure-dialog').showModal();
      } else if (a === 'craft') {
        if (!requireAuth()) return;
        document.querySelector('#craft-dialog').showModal();
      } else if (a === 'teach') {
        if (!requireAuth()) return;
        document.querySelector('#teach-dialog').showModal();
      } else if (a === 'form-group') {
        if (!requireAuth()) return;
        document.querySelector('#group-dialog').showModal();
      } else if (a === 'found-settlement') {
        if (!requireAuth()) return;
        document.querySelector('#settlement-dialog').showModal();
      } else if (a === 'place-structure') {
        if (!requireAuth()) return;
        document.querySelector('#structure-dialog').showModal();
      } else if (a === 'inspect-region') {
        toast('This starting region has water, forage, wood, stone, and migration pressure.', 'info');
      } else if (a === 'focus-map') {
        const canvas = document.querySelector('#world-canvas');
        if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (['character', 'family', 'society', 'learn', 'culture', 'trade', 'govern', 'chronicle'].includes(a)) {
        navigateTo(a);
      } else {
        const actionMap = {
          travel: { type: 'travel', needsRegion: true },
          forage: { type: 'gather_resource', needsResource: true },
          hunt: { type: 'hunt' },
          rest: { type: 'rest' }
        };
        const mapped = actionMap[a];
        if (mapped) {
          if (!requireAuth()) return;
          setButtonLoading(btn, true);

          if (mapped.type === 'travel') {
            const regionsRes = await api('GET', '/world/regions');
            if (!regionsRes.ok) { setButtonLoading(btn, false); toast('Could not load regions.', 'error'); return; }
            const regions = regionsRes.data.regions || [];
            if (regions.length <= 1) { setButtonLoading(btn, false); toast('Only one region available.', 'info'); return; }
            const char = await findFirstCharacter();
            if (!char) { setButtonLoading(btn, false); toast('No character.', 'error'); return; }
            const otherRegions = regions.filter(r => r.id !== char.region_id);
            if (otherRegions.length === 0) { setButtonLoading(btn, false); toast('No other regions to travel to.', 'info'); return; }
            const target = otherRegions[0];
            const result = await submitAction('travel', { regionId: target.id });
            setButtonLoading(btn, false);
            if (result.ok) { toast(`Traveling to ${target.name}!`, 'success'); pendingActionCount++; updatePendingUI(); }
            else { toast(result.data?.error || 'Travel failed', 'error'); }
          } else if (mapped.type === 'gather_resource') {
            const char = await findFirstCharacter();
            if (!char) { setButtonLoading(btn, false); toast('No character.', 'error'); return; }
            const result = await submitAction('gather_resource', { characterId: getActiveCharacterId() });
            setButtonLoading(btn, false);
            if (result.ok) { toast('Foraging queued!', 'success'); pendingActionCount++; updatePendingUI(); }
            else { toast(result.data?.error || 'Foraging failed', 'error'); }
          } else {
            const result = await submitAction(mapped.type);
            setButtonLoading(btn, false);
            if (result.ok) {
              toast(`Action queued: ${mapped.type}`, 'success');
              pendingActionCount++;
              updatePendingUI();
            } else {
              toast(result.data?.error || result.error || 'Action failed', 'error');
            }
          }
        } else {
          toast(`"${a}" is not yet wired.`, 'info');
        }
      }
    });
  });
}

export function resetPendingCount() {
  pendingActionCount = 0;
  updatePendingUI();
}
