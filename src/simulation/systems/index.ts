import { constructionSystem } from './construction.js';
import { injuriesSystem } from './injuries.js';
import { individualResourcesSystem } from './individualResources.js';
import { playerActionsSystem } from './playerActions.js';
import { resourceSystem } from './resources.js';
import { survivalSystem } from './survival.js';
import type { SimulationSystem } from '../types.js';
import { orderSystems } from '../systemOrder.js';

const unorderedSimulationSystems: SimulationSystem[] = [
  resourceSystem,
  individualResourcesSystem,
  survivalSystem,
  injuriesSystem,
  playerActionsSystem,
  constructionSystem
];

export const simulationSystems: SimulationSystem[] = orderSystems(unorderedSimulationSystems);
