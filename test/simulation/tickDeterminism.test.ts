import { describe, expect, it } from 'vitest';
import { executeSimulationSystems } from '../../src/simulation/executeSystems.js';
import type { SimulationSystem, TickContext } from '../../src/simulation/types.js';

function createSystem(name: SimulationSystem['name'], calls: string[]): SimulationSystem {
  return {
    name,
    async run() {
      calls.push(name);
      return {
        system: name,
        processed: calls.length,
        events: 0,
        metrics: {
          order: calls.length
        }
      };
    }
  };
}

describe('tick determinism', () => {
  it('runs systems sequentially and records metrics in the same order', async () => {
    const calls: string[] = [];
    const metricRows: unknown[] = [];
    const systems = [
      createSystem('player_actions', calls),
      createSystem('resources', calls),
      createSystem('survival', calls)
    ];
    const context = {
      tickNumber: 42,
      gameDay: null,
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
      pool: {},
      client: {
        async query(_sql: string, params: unknown[]) {
          metricRows.push(params);
          return { rows: [], rowCount: 1 };
        }
      }
    } as unknown as TickContext;
    let nowValue = 1000;

    const results = await executeSimulationSystems(context, systems, () => {
      nowValue += 5;
      return nowValue;
    });

    expect(calls).toEqual(['player_actions', 'resources', 'survival']);
    expect(results.map((result) => result.system)).toEqual(calls);
    expect(metricRows).toEqual([
      [42, 'player_actions', 1, 0, 5, { order: 1 }],
      [42, 'resources', 2, 0, 5, { order: 2 }],
      [42, 'survival', 3, 0, 5, { order: 3 }]
    ]);
  });
});
