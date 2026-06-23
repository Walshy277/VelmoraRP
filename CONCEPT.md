# Velmora: Dawn of Civilization — Game Concept

## Based on Torn.com's Core Design Philosophy

---

# PART 1: TORN.COM DECONSTRUCTED

## What Makes Torn Tick (Pun Intended)

Torn.com is a text-based persistent browser RPG (PBBG). Its success comes from a carefully engineered set of systems that create **infinite horizontal and vertical progression** with **no resets**. Here is what we reverse-engineer:

### 1. The Core Resource Loop

| Resource | Regen | Purpose |
|----------|-------|---------|
| **Energy** | 5 per 15min (base 100 cap) | Gym training, attacking |
| **Nerve** | 1 per 5min (base 15-60 cap) | Crimes |
| **Happy** | 5 per 15min (base 10k cap) | Multiplier for gym gains |

**Key insight:** Energy is the *active play* currency. You log in, spend energy, wait for regen. Nerve is the *passive progression* currency — you come back to do crimes when full. Happy is the *strategic amplifier* — you stack it for efficiency bursts ("happy jumps").

### 2. The Three Progression Pillars

**A. Battle Stats (Vertical Progression)**
- 4 stats: Strength, Defense, Speed, Dexterity  
- Trained in gyms using Energy + Happy  
- Exponential growth curve — no cap  
- Used for PvP combat  
- Players optimize ratios for special gym access (e.g., "Hank's Ratio": 35% STR, 28% DEF, 28% SPD, 9% DEX)

**B. Crime/Nerve System (Horizontal Progression)**
- ~50+ crimes unlocked via education, levels, and crime experience  
- Hidden Crime Experience (CE) stat grows nerve bar capacity  
- Crimes produce money, items, and progress  
- Organized Crimes (faction) require coordination  

**C. Economy & Life Skills**
- **Jobs** (11 city jobs, 39 player-owned companies)  
- **Education** (passive time-gated perks, stat boosts, unlocks)  
- **Stock Market** (real-world price correlated)  
- **Properties** (14 tiers, housing, vaults, airstrips)  
- **Travel** (11 destinations, arbitrage trading)  
- **Item Market** (player-driven economy, 1000+ items)  

### 3. Social Structures

- **Factions** — Player-run groups with banks, armories, perks  
- **Ranked Wars / Territory Wars** — Faction vs faction combat cycles  
- **Organized Crimes** — Coordinated group activities  
- **Marriage** — Shared housing benefits  
- **Companies** — Hire other players as employees  

### 4. The Daily Loop

```
Login → Collect passive income → Spend Energy training → 
Spend Nerve on crimes → Check businesses → Trade → 
Plan with faction → Log off until energy regens
```

The genius is that **15 minutes** of gameplay is meaningful, but so is **4 hours**. The tick system accommodates both casual and hardcore.

### 5. Critical Tornisms to Preserve

- **No resets** — permanent account, infinite progression  
- **Sandbox** — no forced path, do what you want  
- **Player-driven economy** — all goods produced and traded by players  
- **Hidden stats** (like CE) — creates mystery and expertise gaps  
- **Time-gated progression** — education takes weeks, stats take years  
- **Item sink** — consumables, decay, PvP losses  
- **Multi-layered** — new features unlock at level thresholds  
- **Organic community** — factions with real politics, wars, alliances  

---

# PART 2: VELMORA — THE CONCEPT

## Theme

**Realistic individual survival & advancement from absolute zero.** "Civilization" is not a feature — it is the emergent story of thousands of players pursuing their own lives. No fantasy, no magic, no supernatural. The world starts raw: untamed wilderness, no tools, no language, no concepts. Every player must discover everything from fire to metallurgy for themselves.

## The Core Principle: Individuals First, Civilization Last

Most civ-building games invert reality: they treat "the tribe" or "the civilization" as the player entity. This game does the opposite.

**You are one person.** You have two hands, a stomach that gets empty, and a brain that knows nothing. What you achieve — your stats, your knowledge, your shelter, your wealth — belongs to *you*, not to any group.

**Civilization emerges naturally.** When one player learns to make fire and teaches another; when two players trade flint for meat; when ten players decide to build huts near each other for protection; when one player tries to take another's stash by force — *that* is civilization. It is not tracked, not measured, not a progress bar. It is the collective side-effect of individual choices.

> **Torn.com has no "city advancement" mechanic. The city is alive simply because thousands of players are living in it. Velmora is the same.**

## Setting: The Dawn

The game begins in a prehistoric era equivalent to our Paleolithic (~50,000 BCE). The planet is unnamed. There are no predefined "nations" or "cultures" — only **geographic regions** with distinct biomes and resources.

### Preset Regions (Unnamed at Start)

Each region is a large map tile with unique resources and challenges. Players spawn into one or can travel between them (dangerously).

| Region | Biome | Key Resources | Challenge |
|--------|-------|---------------|-----------|
| **Region A** | Temperate forest/river valley | Fresh water, timber, clay, flint, game animals | Mild winters, predators |
| **Region B** | Arid savanna/desert edge | Obsidian, salt, hardy grains, large game | Water scarcity, extreme heat |
| **Region C** | Coastal archipelago | Fish, seaweed, shells, driftwood, whales | Limited land, storms, isolation |
| **Region D** | Taiga/pine forest | Fur-bearing animals, amber, iron deposits | Harsh winters, short growing season |
| **Region E** | Tropical jungle | Fruits, medicinal plants, hardwoods, rubber | Disease, dense terrain |
| **Region F** | Mountain valley | Stone, copper/tin ores, fast rivers for power | Cold, steep terrain, avalanches |
| **Region G** | Grassland steppe | Horses, grazing land, mammoths, flint | Exposure, nomadic competition |
| **Region H** | Wetlands/delta | Reeds, fish, fertile silt, peat | Insects, flooding, dense foliage |

**No region is inherently "better"** — trade and conflict between regions creates the meta-game.

---

# PART 3: CORE SYSTEMS (Mapped from Torn)

## 3.1 Primary Resources

### Energy (体力 / "Vigor")
- **Regen:** 5 per 10 minutes (base cap: 100)  
- **Used for:** Gathering, hunting, construction, crafting, combat  
- **Boosted by:** Better shelter, food quality, rest upgrades  
- **Analogous to:** Torn Energy  

### Focus (集中 / "Innovation")
- **Regen:** 1 per 10 minutes (base cap: 10-50)  
- **Used for:** Research, discovery, invention attempts, complex crafting  
- **Growth:** Hidden "Insight" stat increases cap, gained by successful discoveries and inventions  
- **Analogous to:** Torn Nerve  

### Morale (士气 / "Contentment")
- **Regen:** 5 per 15 minutes (base cap depends on shelter quality: 100-10,000)  
- **Effect:** Efficiency multiplier on all actions (gathering, crafting, fighting)  
- **Boosted by:** Shelter quality, food variety, art, social bonding, ritual  
- **Analogous to:** Torn Happy  

### Hunger/Health Bar
- **Decay:** 1 per 30 minutes (must eat regularly)  
- **Consequence:** Empty stomach reduces Energy regen by 50%. Starvation causes stat damage.  
- **Not present in Torn** — adds survival pressure  

## 3.2 Character Stats

Six foundational stats, trained by doing (no trainers — you learn by doing):

| Stat | Effect | Trained By |
|------|--------|------------|
| **Might** (STR) | Damage in combat, heavy lifting, construction speed | Chopping wood, mining, combat |
| **Fortitude** (CON) | Health, disease resistance, survival in harsh climates | Enduring weather, eating well, fighting |
| **Dexterity** (DEX) | Crafting quality, hunting success, tool accuracy | Fine crafting, spear-throwing, toolmaking |
| **Intellect** (INT) | Research speed, invention probability, teaching | Observing nature, experimenting, learning from elders |
| **Cunning** (WIS) | Trap-setting, resource efficiency, diplomacy | Hunting, planning, trading, leading |
| **Presence** (CHA) | Leadership, trade prices, group cohesion | Leading groups, trading, storytelling |

**Growth:** Exponential (like Torn battle stats). No cap. Gains per action diminish as stat rises but never stop.

## 3.3 Technology & Discovery (Education Analog)

Instead of "Education courses" you have a **Knowledge Web** — a branching tree of concepts you can research using **Focus**.

### The Empty Start
At character creation, **you know nothing**. Your knowledge screen is blank. You cannot build, craft, or even light a fire.

### Learning by Doing
Some discoveries happen automatically by observation:
- Watching the sun and stars → concept of "time"  
- Rubbing two sticks → concept of "fire"  
- Hitting a rock with another rock → concept of "tool"

### Research Using Focus
For deliberate innovation, spend Focus:
- **Primitive Toolmaking** (10 Focus) → Unlocks: Stone Axe, Spear  
- **Fire Mastery** (15 Focus) → Unlocks: Campfire, Cooked Food, Torch  
- **Shelter Construction** (20 Focus) → Unlocks: Lean-to, Hut  

### The Progression Arc (No End)
Research is *not* a tech tree you finish. It branches infinitely:
```
Paleolithic → Neolithic → Bronze Age → Iron Age → Classical → 
Medieval → Renaissance → Industrial → Modern → Future → ...
```

**Knowledge is individual, not global.** When you research bronze-smelting, *you* know it. You can teach others, sell the knowledge, hoard it, or let it die with you. There is no "world tech level" — there are only informed and uninformed players.

Players deep in the game may be researching gunpowder while new players are still learning to make fire the next valley over. The gap creates the same dynamic as Torn's high-level vs low-level players.

---

# PART 4: GAMEPLAY SYSTEMS

## 4.1 Gathering & Resources

### Resource Nodes
The world contains finite (but large) deposits of:
- **Biotic:** Berries, herbs, game animals, fish, wood, fibers  
- **Geologic:** Flint, obsidian, clay, stone, ores, salt, gems  
- **Strategic:** Fresh water sources, fertile soil, natural harbors  

### Resource Depletion & Renewal
- Animals: Can be over-hunted → migrate or go locally extinct  
- Trees: Regrow over days/weeks  
- Ores: Finite but deep deposits last months/years  
- Soil: Can be exhausted by over-farming  

## 4.2 Crafting & Construction

### Crafting (Analogous to Item Market)
All items are crafted by players from raw resources:
- **Tools:** Stone knife, axe, hammer, hoe, fishing hook  
- **Weapons:** Spear, bow, club, sling, atlatl  
- **Armor:** Hide, bone, later bronze, iron  
- **Containers:** Baskets, pouches, pottery  
- **Clothing:** Woven fibers, furs, leather  

### Construction (Analogous to Properties)
Players build structures of increasing complexity:
- **Tier 1:** Lean-to, windbreak, temporary camp  
- **Tier 2:** Hut (wattle & daub), pit house  
- **Tier 3:** Longhouse, palisade, granary  
- **Tier 4:** Wooden fortress, stone foundation  
- **...continuing through castles, towns, cities...**

**Construction requires:** Energy + materials + tools + enough people  

## 4.3 Cooperation & Groups (Analogous to Torn Factions + Companies)

### Individual is the Default
You start alone. Everything you earn is yours. You can stay solo indefinitely — many players in Torn never join a faction.

### Voluntary Cooperation
If players choose to work together:
- **Ad-hoc:** Two players agree to hunt together for a session, share the harvest  
- **Camps:** Multiple players build shelters near each other for mutual protection  
- **Formal groups:** Players can form named groups with shared storage (like faction armories)  

### Group Features (Emergent)
Groups that form naturally can develop:
- **Shared storage** (members opt into shared resource pools)  
- **Specialization** (one player focuses on hunting, another on crafting — voluntary trade)  
- **Joint projects** (large construction that no single player could complete alone)  
- **Mutual defense** (group members can come to each other's aid in combat)  

### There Is No "Tribe Mechanic"
The game does not track "civilization progress," "tribe tech level," or "group advancement." Groups are simply players who have chosen to cooperate. Whether they build a hut together or a city over years is up to them — and the game treats it the same either way.

### Politics & Conflict
- Leadership emerges naturally (the person others listen to)  
- Groups can trade, ally, or betray  
- Territory disputes over resources  
- **No NPC enforcement** — everything is emergent player politics  
- **Civilization is a story, not a mechanic** — no "tribe advancement" screen, no "era progress" bar. If civilization happens, it's because players are looking at the world and saying "look what we built."  

## 4.4 Combat System (Analogous to Torn Attacking)

### Combat Stats
Might, Dexterity, Fortitude + equipment quality + group coordination  

### Combat Types
1. **Hunting** (PvE) — kill animals for food, hides, bones  
2. **Scuffles** (PvP) — personal disputes, theft attempts  
3. **Raids** (PvP) — small group attacks on settlements  
4. **Territory Wars** (PvP) — organized settlement-vs-settlement conflicts  

### Consequences
- **Injury:** Reduces stats temporarily, requires medical attention  
- **Death:** Lose some progression (items, stats), respawn at settlement  
- **Captivity:** Rarer — taken prisoner, must escape or be ransomed  

## 4.5 Trade & Economy (Analogous to Torn Item Market)

### Barter System
Initially no currency. Players trade goods directly.  

### The Emergence of Currency
Players can invent currency (shell beads, salt bars, metal coins) via research. Whether any region adopts currency is player-driven.

### Trade Mechanics
- **Local trade:** Face-to-face between characters in same region  
- **Long-distance:** Trading expeditions (like Torn travel) — time-gated, dangerous  
- **Markets:** Settlements can host market days  

## 4.6 Exploration (Analogous to Torn Travel)

### The World Map
- Regions are separate map tiles  
- Travel between regions is **time-gated** (like Torn flights) and dangerous  
- No "instant travel" — must move on foot, later by animal, even later by vehicle  
- Unknown regions are hidden until discovered by a player  

### Discovery Mechanics
- Scouting consumes Energy  
- Reveals resource locations, other settlements, geographic features  
- First player to reach a region gets a permanent "Discoverer" honor  

---

# PART 5: PROGRESSION & THE TICK ECONOMY

## 5.1 Tick Structure

| Tick | Interval | What Happens |
|------|----------|--------------|
| **Fast tick** | Every 30 seconds | Energy/Focus/Morale regen, hunger increment |
| **Medium tick** | Every 10 minutes | Resource node regeneration, construction progress, research progress |
| **Slow tick** | Every hour | Animal migration, weather changes, crop growth |
| **Day tick** | Every 24 hours (real-life) | Settlement upkeep, population growth/decline, seasonal effects |

## 5.2 The "Always Something to Do" Design

Torn's key strength: you never run out of things to do. Velmora achieves this through multiple non-exclusive loops:

### Parallel Loops
1. **Survival loop:** Gather food → eat → gather more food  
2. **Progress loop:** Use Energy to train stats → stats enable better gathering → better gathering enables better items  
3. **Discovery loop:** Use Focus to research → new tech unlocks → new tech enables new actions  
4. **Social loop:** Interact with other players → trade, share, compete, cooperate  
5. **Economic loop:** Craft goods → trade goods → accumulate wealth → build bigger shelter  

### Low-Energy Activities
When Energy is empty, players can still:
- Browse markets, message others, plan with group  
- Rearrange inventory, study research options  
- Participate in settlement votes/discussions  
- Read world lore/events  
- Observe the world (scouting without moving)  

## 5.3 No Endgame — Infinite Horizons

Like Torn, Velmora has no victory condition. Players define their own goals:

- **The Survivalist:** Become self-sufficient, never rely on anyone  
- **The Scholar:** Master every technology, be the smartest  
- **The Trader:** Accumulate more wealth than anyone  
- **The Warlord:** Dominate others through strength  
- **The Explorer:** Map every region, see everything  
- **The Crafter:** Produce the finest goods in the world  
- **The Teacher:** Spread knowledge, build a school of thought  
- **The Hermit:** Live alone in the wilderness, untouched by "civilization"  

All equally valid. The game does not prefer any path.

---

# PART 6: COMPARISON MATRIX

| Torn Feature | Velmora Equivalent | Why Different |
|-------------|-------------------|---------------|
| Energy | Vigor (Energy) | Same core mechanic |
| Nerve | Focus | Same concept, different name/theme |
| Happy | Morale | Same multiplier concept |
| Battle Stats (4) | 6 Foundational Stats | More granular for individual growth |
| Crimes | Actions (gather, craft, build, research) | No crime theme; constructive |
| Education | Knowledge Web (Research) | Same time-gated passive progression; **per-character, not per-world** |
| Gyms | Practice/Action training | Learn by doing, not clicking a gym interface |
| Items | Crafted tools, weapons, goods | All player-made, no NPC shops |
| Properties | Shelters (personal) | You build your own home. No shared "settlement" entity. |
| Factions | Voluntary player groups | No faction mechanics. Just players who choose to cooperate. |
| Companies | Specialization/Labor roles | Less formal, more organic |
| Travel | Exploration/Expeditions | Same time-gated discovery |
| Stock Market | Trade economy (barter → currency) | No stock market, pure player economy |
| Casino | Gambling (dice games, etc.) | Same if players invent it |
| Hospital | Injury/Healing system | Natural recovery, herbal medicine |
| Jail | Captivity | Prisoner-taking |
| Bank | Personal storage/hoarding | No "faction bank." Your stuff is your stuff. |
| Missions | No equivalent | Sandbox, no scripted missions |
| Level System | Knowledge thresholds | Unlocks based on what YOU know, not world progression |
| **Civilization** | **Not a mechanic** | **Emergent story. No tribe screen, no civ progress bar.** |

---

# PART 7: DESIGN PRINCIPLES

1. **Zero Fantasy** — No magic, no supernatural, no unreal elements. Everything must be plausible within known physical laws.

2. **Absolute Start** — Players begin with nothing: no tools, no knowledge, no concepts. Even "fire" must be discovered.

3. **No Resets** — Permanent world, permanent characters. Stats grow forever.

4. **Player-Driven** — No NPCs. No quests. No scripted storyline. The world is what players make it.

5. **Emergent Complexity** — Simple rules + many players = complex outcomes. The economy, politics, and technology level are all emergent.

6. **Tick-Based, Not Real-Time** — Like Torn, the game works in the background. You check in, spend your resources, plan, and leave.

7. **Meaningful Scarcity** — Resources are finite regionally. Trade and conflict over resources is the engine of player interaction.

8. **Information Asymmetry** — No player knows everything. Hidden stats (Insight, etc.), unknown map regions, secret resource locations — expertise matters.

9. **Cooperation is Optional, Not Required** — A solo player can thrive. Groups form because players *choose* they are beneficial, not because the game mandates them. Like Torn, you can play for years without ever joining a faction.

10. **Always More to Learn** — The Knowledge Web has no end. Technology can advance from stone tools to space flight, but the journey takes years.

---

*Concept derived from extensive analysis of Torn.com (est. 2004) — a text-based MMORPG with 1.5M+ registered players and 21+ years of continuous operation without resets.*
