import type { SimulationSystem, SimulationSystemName } from './types.js';

export const SYSTEM_EXECUTION_ORDER = [
  'player_actions',
  'resources',
  'survival',
  'injuries',
  'progression',
  'construction',
  'territory',
  'knowledge',
  'politics'
] as const satisfies readonly SimulationSystemName[];

export function orderSystems(systems: readonly SimulationSystem[]): SimulationSystem[] {
  const byName = new Map(systems.map((system) => [system.name, system]));

  return SYSTEM_EXECUTION_ORDER.map((name) => {
    const system = byName.get(name);

    if (!system) {
      throw new Error(`Missing simulation system: ${name}`);
    }

    return system;
  });
}
