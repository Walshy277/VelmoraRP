import { describe, expect, it } from 'vitest';
import { simulationSystems } from '../../src/simulation/systems/index.js';
import { SYSTEM_EXECUTION_ORDER } from '../../src/simulation/systemOrder.js';

describe('simulation system order', () => {
  it('matches the canonical execution order', () => {
    expect(simulationSystems.map((system) => system.name)).toEqual([...SYSTEM_EXECUTION_ORDER]);
  });
});
