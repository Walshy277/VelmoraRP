import type { SimulationSystem, SimulationSystemResult, TickContext } from './types.js';

export async function executeSimulationSystems(
  context: TickContext,
  systems: readonly SimulationSystem[],
  now: () => number = Date.now
): Promise<SimulationSystemResult[]> {
  const systemResults: SimulationSystemResult[] = [];

  for (const system of systems) {
    const systemStartedAt = now();
    const result = await system.run(context);
    const durationMs = now() - systemStartedAt;

    systemResults.push(result);

    await context.client.query(
      `
        INSERT INTO simulation_system_runs (
          tick_number,
          system_name,
          processed_count,
          emitted_event_count,
          duration_ms,
          metrics
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [context.tickNumber, result.system, result.processed, result.events, durationMs, result.metrics ?? {}]
    );
  }

  return systemResults;
}
