import type { SimulationSystem, SimulationSystemName } from './types.js';

export const SYSTEM_EXECUTION_ORDER = [
  'resources',
  'individual_resources',
  'survival',
  'injuries',
  'player_actions',
  'construction'
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
