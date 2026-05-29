# VelmoraRP Game Design Document

## 1. High Concept

VelmoraRP is a persistent browser-based online civilization simulation and roleplay game where players begin in pre-civilizational conditions and collectively shape the entire history of a living world.

The game simulates the emergence, growth, transformation, and collapse of civilizations through survival-driven cooperation, emergent political systems, knowledge transmission and loss, cultural and religious evolution, and player-driven historical narrative.

There are no fixed quests or scripted storylines. The world itself becomes the story.

## 2. Design Pillars

### 2.1 Emergence Over Scripting

Systems should produce unplanned outcomes through interaction. The design should favor simulation rules, incentives, and constraints over authored quest chains.

### 2.2 Persistence Over Sessions

The world continues evolving even when individual players are offline. Settlements, ruins, institutions, cultural memory, and political consequences remain part of the world state.

### 2.3 Civilization Over Character Progression

Progression is collective rather than primarily individual. A player becomes meaningful through their contribution to families, tribes, institutions, cultures, and civilizations.

### 2.4 Knowledge As Power

Information is more valuable than items or combat statistics. Knowledge must be discovered, taught, written, preserved, institutionalized, traded, stolen, and sometimes lost.

### 2.5 History As Gameplay

Past player actions permanently shape future gameplay. Wars, migrations, collapses, discoveries, religions, dynasties, and laws become playable history.

## 3. Core Game Loops

### 3.1 Civilization Complexity Loop

```text
[ Survival ]
     |
     v
[ Cooperation ]
     |
     v
[ Specialization ]
     |
     v
[ Institution Building ]
     |
     v
[ Expansion / Conflict ]
     |
     v
[ Historical Persistence ]
     |
     v
(Loop restarts at higher complexity)
```

### 3.2 Immediate Player Loop

Time scale: seconds to minutes.

- Gather resources.
- Craft primitive tools.
- Hunt, forage, farm, or prepare food.
- Communicate locally.
- Survive environmental pressure.
- React to nearby threats or opportunities.

### 3.3 Local Community Loop

Time scale: hours to days.

- Build settlements.
- Assign or naturally adopt social roles.
- Organize food supply.
- Establish storage, shelter, and defenses.
- Form leadership structures.
- Negotiate with nearby groups.

### 3.4 Civilizational Loop

Time scale: days to weeks.

- Discover and preserve technologies.
- Build infrastructure.
- Establish governance systems.
- Expand territory.
- Create trade networks.
- Develop culture, religion, laws, and institutions.

### 3.5 Historical Loop

Time scale: weeks to months.

- Civilizations rise, peak, fragment, and collapse.
- Wars and alliances permanently alter political maps.
- Knowledge is preserved, lost, or rediscovered.
- Ruins, artifacts, myths, and written records shape later societies.

## 4. Core Systems

### 4.1 Knowledge System

Knowledge is not a conventional skill tree. It is a world-state asset stored in people, books, institutions, tools, rituals, and infrastructure.

#### Properties

- Knowledge can be discovered through experimentation or environmental pressure.
- Knowledge must be transmitted through teaching, writing, trade, migration, conquest, or institutional practice.
- Knowledge can be localized, secret, public, religious, practical, or technical.
- Knowledge can be lost if carriers die, archives burn, institutions collapse, or cultural continuity breaks.
- Advanced knowledge should require both discovery and social support.

#### Flow

```text
Discovery
   |
   v
Encoding
   |
   v
Transmission
   |
   v
Institutionalization
   |
   v
Diffusion
   |
   v
Preservation or Loss
```

#### Example: Bronze Working

Bronze working may require furnace knowledge, copper access, tin access, alloy ratios, heat control, and a specialist capable of maintaining the process. It may spread through trade guilds, captured artisans, migration, or written metallurgical records. It can collapse if the metallurgists die, supply routes fail, or the guild loses institutional continuity.

### 4.2 Social System

The social system supports dynamic human organization rather than fixed classes or level-based authority.

#### Social Scale

```text
Individuals -> Families -> Clans -> Tribes -> States -> Empires
```

#### Sources Of Authority

- Resource control.
- Reputation.
- Military power.
- Religious legitimacy.
- Economic influence.
- Administrative competence.
- Control of knowledge or archives.

#### Player-Created Governance Types

- Tribal councils.
- Chiefdoms.
- Monarchies.
- Theocracies.
- Republics.
- Merchant oligarchies.
- Military juntas.
- Guild-led city states.

### 4.3 Economy System

The economy evolves with social complexity.

#### Early Game

- Barter economy.
- Direct survival exchange.
- Local resource dependency.
- Informal labor sharing.

#### Mid Game

- Trade routes.
- Specialized labor.
- Stored surplus.
- Settlement markets.
- Proto-currency or commodity standards.

#### Late Game

- Taxation systems.
- State-controlled infrastructure.
- Guild monopolies.
- Long-distance trade networks.
- Institutional treasuries.

### 4.4 Territory System

Territory should evolve from practical occupation into political abstraction.

#### Control Types

- Presence-based control in the early game.
- Construction-based control in the mid game.
- Political, legal, or bureaucratic control in the late game.

#### Territory Provides

- Resource access.
- Strategic positioning.
- Settlement capacity.
- Population growth capacity.
- Defensive value.
- Cultural identity and legitimacy.

### 4.5 Culture And Religion System

Culture emerges from shared events, geography, survival conditions, conflict, myth formation, and historical interpretation.

Religions are player-created belief systems that may evolve over time, split into sects, legitimize rulers, cause wars, preserve knowledge, regulate behavior, and shape law.

Culture and religion should not be purely cosmetic. They should affect cohesion, legitimacy, diplomacy, identity, and long-term historical memory.

### 4.6 Continuity, Injury, And Legacy System

Characters do not permanently die as the default consequence for defeat. VelmoraRP is built around long-term identity, reputation, faction history, and persistent social simulation.

Conflict creates consequences through injury, imprisonment, exile, political disgrace, economic loss, territorial collapse, and influence damage. The character remains part of history, but their position may not.

Possible character states include active, incapacitated, imprisoned, exiled, retired, and missing.

Injuries may include exhaustion, broken limbs, trauma, disease, morale collapse, political disgrace, imprisonment, and battlefield injury. These can affect action efficiency, travel speed, economic productivity, leadership influence, and diplomatic outcomes.

Historical retirement can remove a character from active play without deleting their identity. A ruler may abdicate, a merchant may become irrelevant, a rebel may be imprisoned, or a disgraced noble may retreat from politics.

Persistence is achieved through reputation, faction history, institutions, written history, inherited property, cultural memory, political titles, religious offices, and public memory.

Core principle:

> Your character persists, but your position is never guaranteed.

## 5. World Simulation Model

The world state is layered so that systems can interact without becoming a single monolithic simulation.

```text
WORLD STATE
|-- Geography Layer
|   |-- Terrain
|   |-- Climate zones
|   |-- Rivers, coastlines, mountains
|
|-- Resource Layer
|   |-- Renewable resources
|   |-- Deposits
|   |-- Seasonal availability
|
|-- Population Layer
|   |-- Player characters
|   |-- Families and lineages
|   |-- NPC labor or population groups
|
|-- Political Layer
|   |-- Settlements
|   |-- Claimed territory
|   |-- Laws and leadership
|   |-- Diplomatic relationships
|
|-- Knowledge Layer
|   |-- Discoveries
|   |-- Techniques
|   |-- Written records
|   |-- Institutional knowledge
|
|-- Cultural Layer
    |-- Belief systems
    |-- Customs
    |-- Myths
    |-- Historical memory
```

## 6. System Diagrams

### 6.1 Full Game Architecture Loop

```text
         +----------------------+
         |    Player Actions    |
         +----------+-----------+
                    |
                    v
         +----------------------+
         |  Simulation Engine   |
         |  World Tick System   |
         +----------+-----------+
                    |
   +----------------+----------------+
   |                |                |
   v                v                v
+---------+   +-------------+   +-----------+
| Economy |   | Knowledge   |   | Territory |
| System  |   | System      |   | System    |
+----+----+   +------+------+   +-----+-----+
     |               |                |
     +---------------+----------------+
                     |
                     v
          +----------------------+
          | Persistent World DB  |
          +----------+-----------+
                     |
                     v
          +----------------------+
          |  World State Output  |
          +----------------------+
```

### 6.2 Knowledge Propagation Model

```text
[ Discovery ]
      |
      v
[ Local Use ]
      |
      v
[ Specialists Form ]
      |
      v
[ Institution Built ]
      |
      v
[ Trade / War / Migration ]
      |
      v
[ Regional Diffusion ]
      |
      v
[ Global Adoption or Loss ]
```

### 6.3 Civilization Lifecycle

```text
Birth -> Growth -> Expansion -> Peak -> Fragmentation -> Collapse -> Dark Age -> Renaissance
```

Each cycle should produce ruins, myths, lost technologies, displaced populations, successor states, and new civilizations.

## 7. Server Architecture

### 7.1 High-Level Architecture

```text
                 CLIENTS
          Web Client / Game Client
                     |
                     v
             +---------------+
             | API Gateway   |
             +-------+-------+
                     |
     +---------------+----------------+
     |               |                |
     v               v                v
+------------+ +----------------+ +-------------+
| World      | | Simulation     | | Auth System |
| Servers    | | Core           | | Accounts    |
| Regions    | | Tick Engine    | | Sessions    |
+-----+------+ +--------+-------+ +-------------+
      |                 |
      +--------+--------+
               |
               v
       +---------------------+
       | Event Sourcing DB   |
       | PostgreSQL          |
       +----------+----------+
                  |
                  v
       +---------------------+
       | Historical Archive  |
       | World State Logs    |
       +---------------------+
```

### 7.2 Simulation Model

The server runs on discrete ticks. Early targets may use 1 to 10 second ticks depending on player count, simulation cost, and responsiveness requirements.

The game should feel real time, but civilization progress should not be equally fast for every group size. Low member count means slow progression. A lone player or tiny camp can survive, gather, and build, but large-scale construction, knowledge preservation, territory control, and institutional growth should advance much more slowly until the group has enough active members and supporting institutions.

At world creation there is no calendar and no shared time concept. This is the dawn of civilization: no known regions, no recorded history, and no established worldview. The creator account does not begin the historical calendar. The first normal player registration after the creator begins Day 1.

The first registered account is treated as the creator account. The creator can prepare or administer the blank canvas, but does not count as the first historical inhabitant. The second registered account, as the first normal player, starts Day 1.

After Day 1 begins, days progress with real time, with the initial rule being one real day equals one in-game day. Tick count does not define the calendar; ticks only process simulation work inside the current real-time day.

Because the starting population is small, players are unlikely to meet immediately. The early game must support isolated survival. Players fend for themselves until exploration, migration, and new registrations create enough density for social structures to emerge.

Each tick may process:

- Movement.
- Resource regeneration and depletion.
- Hunger, health, and environmental pressure.
- Injuries, recovery, and incapacitation.
- Construction progress.
- Crafting progress.
- Knowledge spread.
- Political state updates.
- Territory control evaluation.
- Historical event emission.

### 7.3 World Sharding Strategy

The world is divided into geographic regions. Each region is handled by a simulation node.

```text
+----------------+   +----------------+   +----------------+
| North Region   |   | Central Region |   | South Region   |
| Server A       |   | Server B       |   | Server C       |
+-------+--------+   +-------+--------+   +-------+--------+
        |                    |                    |
        +--------------------+--------------------+
                             |
                             v
                  +---------------------+
                  | Cross-Region Event |
                  | Sync               |
                  +---------------------+
```

Cross-region interaction is handled through event synchronization. Border movement, trade, warfare, migration, and diplomatic effects should emit durable events that can be replayed or audited.

## 8. High-Level Data Models

These are conceptual models, not final database schemas.

### 8.1 Player Account

- Account ID.
- Authentication identity.
- Current character ID.
- Reputation records.
- Moderation and audit metadata.

### 8.2 Character

- Character ID.
- Account ID.
- Name.
- Age and continuity state.
- Family or lineage ID.
- Location.
- Known knowledge entries.
- Social affiliations.
- Inventory.
- Health and survival state.

### 8.3 Group

- Group ID.
- Type: family, clan, tribe, guild, religion, state, empire.
- Name.
- Members.
- Leadership rules.
- Claimed territory.
- Laws or customs.
- Reputation with other groups.

### 8.4 Settlement

- Settlement ID.
- Name.
- Location and region.
- Controlling group.
- Population.
- Structures.
- Storage.
- Defenses.
- Historical events.

### 8.5 Knowledge Entry

- Knowledge ID.
- Name.
- Category.
- Discovery requirements.
- Known carriers.
- Written records.
- Required tools or infrastructure.
- Diffusion state.
- Loss risk.

### 8.6 Territory Claim

- Claim ID.
- Region or polygon reference.
- Claiming group.
- Control type.
- Strength.
- Contesting groups.
- Last evaluated tick.

### 8.7 Historical Event

- Event ID.
- Timestamp or world tick.
- Event type.
- Location.
- Participants.
- Systems affected.
- Human-readable summary.
- Replay payload.

## 9. MVP Scope

### 9.1 MVP Goal

The MVP must prove that players naturally create social structures and emergent civilization behavior.

The MVP does not need to prove graphics quality, deep combat, large content volume, AI civilization behavior, or a complete technology timeline.

### 9.2 Phase 1 MVP Scope

#### World

- Single small-continent map.
- 50 to 200 concurrent players.
- Region-based server architecture kept simple enough for iteration.

#### Core Systems

- Gathering: food, wood, stone.
- Basic crafting.
- Hunger and survival.
- Simple building placement.
- Basic communication and local chat.
- Persistent structures.

#### Social Mechanics

- Player-created groups or tribes.
- Territory claim through structures.
- Basic leadership by vote, appointment, or reputation.
- Shared group storage.

#### Persistence

- Continuous world state saving.
- Persistent structures.
- Character and group history logs.
- Historical event log suitable for admin review and later in-game history systems.

### 9.3 MVP Exclusions

- Complex combat.
- Full religion system.
- Advanced economy.
- AI civilizations.
- Full technology tree.
- Large-scale naval systems.
- Fully simulated dynastic inheritance.
- Complex legal systems.

### 9.4 MVP Success Criteria

The MVP is successful if players naturally:

- Form stable groups.
- Assign roles.
- Establish leadership.
- Create trade behavior.
- Develop resource conflict.
- Produce recognizable local history.
- Return to persistent consequences from earlier sessions.

## 10. Development Roadmap

### Phase 1: Prototype

Target duration: 4 to 8 weeks.

- Movement system.
- Basic multiplayer synchronization.
- Resource gathering.
- Hunger and survival state.
- Persistence backend.
- Minimal admin observation tools.

### Phase 2: Social Layer

Target duration: 4 to 6 weeks.

- Tribes and groups.
- Chat and local communication.
- Territory claiming.
- Building placement and ownership.
- Basic group roles.

### Phase 3: Persistence And Balance

Target duration: 6 to 10 weeks.

- World saving hardening.
- Resource regeneration and depletion balancing.
- Survival tuning.
- Historical event log.
- Settlement persistence.
- Admin and analytics visibility.

### Phase 4: Civilization Systems

Future scope.

- Knowledge system.
- Governance.
- Religion.
- Expanded economy.
- Dynasty and legacy.
- Ruins and archaeology.

## 11. Key Risks And Mitigations

### 11.1 Player Dominance

Risk: Early groups may monopolize resources and suppress new players.

Mitigations:

- Geographic diversity.
- Migration incentives.
- Resource regeneration balancing.
- Soft caps on local extraction.
- New-player spawn distribution.

### 11.2 Player Attrition

Risk: Slow civilization games can lose players before social depth emerges.

Mitigations:

- Short-term survival goals.
- Visible settlement progress.
- Constant local needs.
- Meaningful social roles.
- Frequent small conflicts over resources.

### 11.3 Emergent Chaos

Risk: Players may break systems in unexpected ways.

Mitigations:

- Event logging.
- Admin observability tools.
- Soft simulation constraints.
- Rate limits for high-impact actions.
- Replayable event history.

### 11.4 Simulation Cost

Risk: Persistent world simulation may become too expensive as the world grows.

Mitigations:

- Region-based ticking.
- Lower-frequency background simulation for inactive regions.
- Event-sourced state transitions.
- Snapshotting.
- System-specific tick budgets.

### 11.5 Social Toxicity

Risk: Political and roleplay systems may encourage harassment or exclusion.

Mitigations:

- Moderation logs.
- Report tooling.
- Clear conduct rules.
- Permission boundaries for groups and property.
- Admin visibility into high-impact social actions.

## 12. Design Summary

VelmoraRP is not a traditional quest-driven game. It is a persistent simulation of human civilization where players are the authors of history.

The core engineering challenge is not content creation. It is supporting emergent behavior without allowing the simulation, social layer, or server architecture to collapse under that behavior.
