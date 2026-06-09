import type { PoolClient } from 'pg';
import type { SimulationSystem } from '../types.js';
import { GROUP_EVOLUTION_ORDER } from '../../domain/society.js';

interface EvolutionCandidate {
  groupId: string;
  currentType: string;
  targetType: string;
  activeMembers: number;
  settlementCount: number;
  institutionCount: number;
  knowledgeCount: number;
  territoryRegions: number;
  allianceCount: number;
  governanceKeys: number;
  ticksSinceFounded: number;
}

const EVOLUTION_THRESHOLDS: Record<
  string,
  {
    targetType: string;
    minMembers: number;
    minSettlements: number;
    minInstitutions: number;
    minKnowledge: number;
    minTerritoryRegions: number;
    minAllies: number;
    minGovernanceKeys: number;
    minTicks: number;
    description: string;
  }
> = {
  group_clan: {
    targetType: 'clan',
    minMembers: 5,
    minSettlements: 0,
    minInstitutions: 1,
    minKnowledge: 0,
    minTerritoryRegions: 0,
    minAllies: 0,
    minGovernanceKeys: 0,
    minTicks: 10,
    description: 'Group has gathered enough members and built a foundation to be recognized as a clan.'
  },
  clan_alliance: {
    targetType: 'alliance',
    minMembers: 15,
    minSettlements: 1,
    minInstitutions: 2,
    minKnowledge: 1,
    minTerritoryRegions: 0,
    minAllies: 1,
    minGovernanceKeys: 1,
    minTicks: 25,
    description: 'Clan has grown large enough to formalize alliances and claim settlement rights.'
  },
  alliance_faction: {
    targetType: 'faction',
    minMembers: 30,
    minSettlements: 2,
    minInstitutions: 3,
    minKnowledge: 3,
    minTerritoryRegions: 1,
    minAllies: 2,
    minGovernanceKeys: 2,
    minTicks: 50,
    description: 'Alliance has solidified into a political faction with territory and governance.'
  },
  faction_dynasty: {
    targetType: 'dynasty',
    minMembers: 50,
    minSettlements: 3,
    minInstitutions: 5,
    minKnowledge: 6,
    minTerritoryRegions: 1,
    minAllies: 3,
    minGovernanceKeys: 3,
    minTicks: 100,
    description: 'Faction has established enduring institutions and succession legitimacy as a dynasty.'
  },
  dynasty_empire: {
    targetType: 'empire',
    minMembers: 100,
    minSettlements: 5,
    minInstitutions: 8,
    minKnowledge: 10,
    minTerritoryRegions: 2,
    minAllies: 4,
    minGovernanceKeys: 4,
    minTicks: 200,
    description: 'Dynasty has expanded across multiple regions with unchallenged dominance as an empire.'
  }
};

async function findEvolutionCandidates(client: PoolClient): Promise<EvolutionCandidate[]> {
  const result = await client.query<EvolutionCandidate>(
    `
      SELECT
        g.id AS "groupId",
        g.type AS "currentType",
        COALESCE(pr.active_member_count, 0) AS "activeMembers",
        COALESCE(settlement_stats.settlement_count, 0) AS "settlementCount",
        COALESCE(pr.institution_count, 0) AS "institutionCount",
        COALESCE(knowledge_stats.knowledge_count, 0) AS "knowledgeCount",
        COALESCE(territory_stats.region_count, 0) AS "territoryRegions",
        COALESCE(alliance_stats.alliance_count, 0) AS "allianceCount",
        COALESCE((SELECT COUNT(*)::int FROM jsonb_object_keys(g.governance)), 0) AS "governanceKeys",
        GREATEST(0, EXTRACT(EPOCH FROM (now() - g.founded_at)) / 5000)::int AS "ticksSinceFounded"
      FROM groups g
      LEFT JOIN LATERAL (
        SELECT active_member_count, institution_count
        FROM progression_rates pr
        WHERE pr.scope = 'group'
          AND pr.group_id = g.id
        ORDER BY pr.calculated_tick DESC
        LIMIT 1
      ) pr ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS settlement_count
        FROM settlements st
        WHERE st.controlling_group_id = g.id
          AND st.abandoned_at IS NULL
      ) settlement_stats ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT ck.knowledge_id)::int AS knowledge_count
        FROM group_knowledge gk
        WHERE gk.group_id = g.id
      ) knowledge_stats ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(DISTINCT tc.region_id)::int AS region_count
        FROM territory_claims tc
        WHERE tc.group_id = g.id
          AND tc.strength > 0
      ) territory_stats ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS alliance_count
        FROM group_relationships gr
        WHERE (gr.source_group_id = g.id OR gr.target_group_id = g.id)
          AND gr.stance = 'friendly'
      ) alliance_stats ON true
      WHERE g.dissolved_at IS NULL
        AND g.type != 'empire'
    `
  );

  return result.rows;
}

function checkEligibility(candidate: EvolutionCandidate): { eligible: boolean; targetType?: string; reason?: string } {
  const currentIdx = GROUP_EVOLUTION_ORDER.indexOf(candidate.currentType as never);

  if (currentIdx < 0 || currentIdx >= GROUP_EVOLUTION_ORDER.length - 1) {
    return { eligible: false, reason: 'Already at maximum evolution tier.' };
  }

  const nextType = GROUP_EVOLUTION_ORDER[currentIdx + 1];
  const thresholdKey = `${candidate.currentType}_${nextType}`;
  const thresholds = EVOLUTION_THRESHOLDS[thresholdKey];

  if (!thresholds) {
    return { eligible: false, reason: `No evolution path defined from ${candidate.currentType} to ${nextType}.` };
  }

  const failures: string[] = [];
  if (candidate.activeMembers < thresholds.minMembers)
    failures.push(`members (${candidate.activeMembers}/${thresholds.minMembers})`);
  if (candidate.settlementCount < thresholds.minSettlements)
    failures.push(`settlements (${candidate.settlementCount}/${thresholds.minSettlements})`);
  if (candidate.institutionCount < thresholds.minInstitutions)
    failures.push(`institutions (${candidate.institutionCount}/${thresholds.minInstitutions})`);
  if (candidate.knowledgeCount < thresholds.minKnowledge)
    failures.push(`knowledge (${candidate.knowledgeCount}/${thresholds.minKnowledge})`);
  if (candidate.territoryRegions < thresholds.minTerritoryRegions)
    failures.push(`territory regions (${candidate.territoryRegions}/${thresholds.minTerritoryRegions})`);
  if (candidate.allianceCount < thresholds.minAllies)
    failures.push(`allies (${candidate.allianceCount}/${thresholds.minAllies})`);
  if (candidate.governanceKeys < thresholds.minGovernanceKeys)
    failures.push(`governance rules (${candidate.governanceKeys}/${thresholds.minGovernanceKeys})`);
  if (candidate.ticksSinceFounded < thresholds.minTicks)
    failures.push(`age (${candidate.ticksSinceFounded}/${thresholds.minTicks} ticks)`);

  if (failures.length > 0) {
    return { eligible: false, reason: `Insufficient: ${failures.join(', ')}.` };
  }

  return { eligible: true, targetType: thresholds.targetType };
}

async function promoteGroup(
  client: PoolClient,
  groupId: string,
  targetType: string,
  tickNumber: number
): Promise<void> {
  await client.query(
    `
      UPDATE groups
      SET type = $1::group_type, governance = jsonb_set(
        governance,
        '{evolved_at}',
        to_jsonb($2::text)
      )
      WHERE id = $3
    `,
    [targetType, tickNumber, groupId]
  );
}

export const evolutionSystem: SimulationSystem = {
  name: 'evolution',
  async run({ client, tickNumber }) {
    const candidates = await findEvolutionCandidates(client);
    let promoted = 0;
    let events = 0;

    for (const candidate of candidates) {
      const { eligible, targetType } = checkEligibility(candidate);

      if (!eligible || !targetType) {
        continue;
      }

      await promoteGroup(client, candidate.groupId, targetType, tickNumber);
      promoted++;

      const thresholdKey = `${candidate.currentType}_${targetType}`;
      const thresholds = EVOLUTION_THRESHOLDS[thresholdKey];

      await client.query(
        `
          INSERT INTO historical_events (tick_number, scope, event_type, group_id, summary, payload)
          VALUES ($1, 'group', 'group_evolved', $2, $3, $4)
        `,
        [
          tickNumber,
          candidate.groupId,
          thresholds?.description ?? `${candidate.currentType} evolved into ${targetType}.`,
          {
            fromType: candidate.currentType,
            toType: targetType,
            metrics: {
              activeMembers: candidate.activeMembers,
              settlements: candidate.settlementCount,
              institutions: candidate.institutionCount,
              knowledgeEntries: candidate.knowledgeCount,
              territoryRegions: candidate.territoryRegions,
              allies: candidate.allianceCount,
              ticksSinceFounded: candidate.ticksSinceFounded
            }
          }
        ]
      );
      events++;
    }

    return {
      system: 'evolution',
      processed: candidates.length,
      events,
      metrics: {
        evaluated: candidates.length,
        promoted
      }
    };
  }
};
