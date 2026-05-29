import type { SimulationSystem } from '../types.js';
import { claimQueuedActions } from '../../actions/actionQueue.js';

export const playerActionsSystem: SimulationSystem = {
  name: 'player_actions',
  async run({ client, tickNumber }) {
    const actions = await claimQueuedActions(client, tickNumber);

    return {
      system: 'player_actions',
      processed: actions.length,
      events: 0
    };
  }
};
