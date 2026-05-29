import { constructionSystem } from './construction.js';
import { injuriesSystem } from './injuries.js';
import { knowledgeSystem } from './knowledge.js';
import { playerActionsSystem } from './playerActions.js';
import { politicsSystem } from './politics.js';
import { progressionSystem } from './progression.js';
import { resourceSystem } from './resources.js';
import { survivalSystem } from './survival.js';
import { territorySystem } from './territory.js';
import type { SimulationSystem } from '../types.js';
import { orderSystems } from '../systemOrder.js';

const unorderedSimulationSystems: SimulationSystem[] = [
  playerActionsSystem,
  resourceSystem,
  survivalSystem,
  injuriesSystem,
  progressionSystem,
  constructionSystem,
  territorySystem,
  knowledgeSystem,
  politicsSystem
];

export const simulationSystems: SimulationSystem[] = orderSystems(unorderedSimulationSystems);
