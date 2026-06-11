import { getSessionToken, getMyCharacters, getActiveCharacterId, submitAction } from './auth.js';
import { toast } from './toast.js';

const actionMapping = {
  travel: 'travel',
  forage: 'gather_resource',
  camp: 'build_structure',
  craft: 'craft_item',
  teach: 'teach',
  govern: null,
  chronicle: null
};

export function wireActionButtons() {
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const a = btn.dataset.action;
      const mapped = actionMapping[a];
      if (mapped) {
        if (!getSessionToken()) { toast('Log in first.', 'error'); return; }
        if (!getActiveCharacterId() && getMyCharacters().length === 0) { toast('Create a character first.', 'error'); return; }
        const result = await submitAction(mapped);
        if (result.ok) {
          toast(`Action queued: ${mapped}`, 'success');
        } else {
          toast(result.data?.error || result.error || 'Action failed', 'error');
        }
      } else if (a === 'inspect-region') {
        toast('This starting region has water, forage, wood, stone, and migration pressure.', 'info');
      } else if (a === 'focus-map') {
        const canvas = document.querySelector('#world-canvas');
        if (canvas) canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (['character', 'family', 'society', 'learn', 'culture', 'trade', 'govern', 'chronicle'].includes(a)) {
        navigateTo(a);
      } else {
        toast(`"${a}" is not yet wired.`, 'info');
      }
    });
  });
}

// Simple hash-based SPA navigation
function navigateTo(view) {
  window.location.hash = view;
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(s => s.style.display = 'none');
  const target = document.querySelector(`#view-${view}`);
  if (target) target.style.display = '';
}
