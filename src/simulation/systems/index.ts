import { constructionSystem } from './construction.js';
import { knowledgeSystem } from './knowledge.js';
import { playerActionsSystem } from './playerActions.js';
import { politicsSystem } from './politics.js';
import { progressionSystem } from './progression.js';
import { resourceSystem } from './resources.js';
import { survivalSystem } from './survival.js';
import { territorySystem } from './territory.js';
import type { SimulationSystem } from '../types.js';

export const simulationSystems: SimulationSystem[] = [
  playerActionsSystem,
  resourceSystem,
  survivalSystem,
  progressionSystem,
  constructionSystem,
  territorySystem,
  knowledgeSystem,
  politicsSystem
];
