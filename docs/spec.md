# Savage Pathfinder – MCP Server & Voice GM (Cloudflare) – Full Specification

**Purpose:** Build a production‑ready Model Context Protocol (MCP) server that persists and orchestrates a complete _Pathfinder for Savage Worlds_ ("Savage Pathfinder") game state while GPT‑5 (Voice Mode) performs as the Game Master. The system supports natural, hands‑free play: players talk to the GM; the GM speaks back, rolls dice, deals initiative cards, tracks positions on a battlemap, reads dice rolled on camera, and enforces core rules.

---

## 1) Objectives & Scope

### 1.1 Goals

- Voice‑first play: players converse with the GM (GPT‑5 Voice Mode) without a keyboard.
- Persistent, queryable game state: PCs, NPCs, powers, edges, hindrances, gear, conditions, Bennies, Conviction, Wounds, Fatigue, Power Points, ammo, etc.
- Combat engine: initiative via Action Deck (including Jokers), Hold/interrupt, turn order, statuses; supports Extras sharing a card and Wild Cards acting individually.
- Spatial awareness: track tokens/miniatures on a gridded battlemap, distances, reach, areas/templates, illumination levels.
- Dice services: cryptographically fair RNG for virtual rolls; camera‑based recognition for physical dice; reconcile disputes.
- Vision: the GM “sees” the table (battlemap + minis + dice) through a camera feed.
- Multi‑party: 1–6+ players, remote or co‑located; session hand‑off and reconnection.
- Cloudflare‑native, scalable, low‑latency; safe concurrent edits; audit trails.
- Open protocol: all game tools exposed via MCP (resources + tools), so any compliant client (e.g., GPT‑5 Voice Mode) can drive the game.

### 1.2 Non‑Goals

- Authoring full adventures or VTT UI: we expose data & actions; UIs are optional.
- Perfect computer‑vision for every dice/mini scenario: we provide robust pipelines + human adjudication fallbacks.

---

## 2) High‑Level Architecture

```
Players (mics/cameras) ─┐                       ┌─ Cloudflare Workers (MCP Server)
                        ├─ WebRTC → GPT‑5 Voice ┤   • HTTP+WS endpoints (MCP transport)
Overhead “Table Cam” ───┘        (Realtime API)  │   • Durable Objects (per game, per deck)
                                                │   • D1 (SQL) • KV (cache) • R2 (media)
Browser “Dice Cam”  ─────────────────────────────┤   • Queues (event bus, optional)
                                                └─ Webhooks/Events → Clients (optional)
```

**Data planes**

- **Voice/vision plane:** Player audio/video streams directly to GPT‑5 Realtime. The model receives frames, understands table state, and calls MCP tools to mutate/query authoritative state.
- **State plane:** MCP server is the single source of truth (SoT) for rules state and persistence.
- **Media plane:** Snapshots (optional), rule logs, and audit artifacts stored in R2.

**Core Cloudflare primitives**

- **Workers**: stateless compute; hosts all HTTP/WS endpoints & MCP server.
- **Durable Objects (DOs)**: strong‑consistency, per‑entity coordination (game session, action deck, RNG, camera‑calibration, etc.).
- **D1**: relational DB (SQLite) for long‑term state (characters, items, sessions, logs).
- **KV**: low‑latency cache for hot reads (e.g., character cards, last known positions).
- **R2**: object storage for image snapshots, rule logs, card decks exported, etc.
- **Queues** (optional): async event fan‑out to dashboards/observers.

---

## 3) Domain Model (Authoritative Schema)

> Types are shown in JSON Schema (abridged); D1 table layouts follow.

### 3.1 Core Entities

#### GameSession

```json
{
  "id": "uuid",
  "name": "string",
  "status": "lobby|in_progress|paused|ended",
  "rulesetVersion": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime",
  "gmRole": "'gpt5'|'human'|'hybrid'",
  "grid": {"unit": "inch|meter|square", "scale": 1.0, "cols": 50, "rows": 50},
  "illumination": "bright|dim|dark",
  "initiativeDeckId": "uuid",
  "rngId": "uuid",
  "round": 3,
  "turn": 1,
  "hold": ["actorId", ...],
  "activeActorId": "uuid|null"
}
```

#### Actor (PC or NPC)

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "type": "pc|npc|creature",
  "name": "string",
  "wildCard": true,
  "traits": {"Agility": "d8", "Smarts": "d6", "Spirit": "d8", "Strength": "d8", "Vigor": "d6"},
  "skills": [{"name": "Fighting", "die": "d8"}, ...],
  "edges": ["EdgeId"...],
  "hindrances": ["HindranceId"...],
  "powers": [{"name": "bolt", "ppCost": 2, "mods": []}],
  "resources": {"bennies": 3, "conviction": 0, "powerPoints": 10, "ammo": {"arrows": 16}},
  "status": {"shaken": false, "stunned": false, "fatigue": 0, "wounds": 1},
  "defense": {"parry": 6, "toughness": 7, "armor": 2},
  "gear": [{"name": "longsword", "ap": 0}, ...],
  "position": {"x": 12, "y": 7, "facing": 90},
  "reach": 1,
  "size": 0
}
```

#### InitiativeCard

```json
{
  "rank": "A|K|Q|J|10..2|Joker",
  "suit": "Spades|Hearts|Diamonds|Clubs|null",
  "id": "uuid"
}
```

#### ActionLog

```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "actorId": "uuid|null",
  "ts": "datetime",
  "kind": "dice|card|state|damage|healing|power|movement|vision|manual",
  "payload": {},
  "by": "gpt|player:<id>|system",
  "seed": "hex|null",
  "hash": "hex"
}
```

### 3.2 D1 Tables (DDL – excerpt)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  rulesetVersion TEXT,
  initiativeDeckId TEXT,
  rngId TEXT,
  round INTEGER DEFAULT 0,
  turn INTEGER DEFAULT 0,
  activeActorId TEXT,
  gridUnit TEXT, gridScale REAL, cols INTEGER, rows INTEGER,
  illumination TEXT,
  createdAt TEXT, updatedAt TEXT
);

CREATE TABLE actors (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  wildCard INTEGER NOT NULL,
  traits TEXT NOT NULL,        -- JSON
  skills TEXT NOT NULL,        -- JSON
  edges TEXT, hindrances TEXT, -- JSON
  powers TEXT,                 -- JSON
  resources TEXT NOT NULL,     -- JSON
  status TEXT NOT NULL,        -- JSON
  defense TEXT NOT NULL,       -- JSON
  gear TEXT,                   -- JSON
  position TEXT,               -- JSON
  reach INTEGER, size INTEGER,
  FOREIGN KEY(sessionId) REFERENCES sessions(id)
);

CREATE TABLE deck_states (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  cards TEXT NOT NULL,        -- JSON array (undealt)
  discard TEXT NOT NULL,      -- JSON array (spent)
  dealt  TEXT NOT NULL,       -- JSON map actorId → card
  lastJokerRound INTEGER,     -- for auto-shuffle
  updatedAt TEXT
);

CREATE TABLE action_logs (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  actorId TEXT,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  by TEXT NOT NULL,
  seed TEXT,
  hash TEXT
);
```

---

## 4) MCP Surfaces (Tools, Resources, Prompts)

The MCP Server exposes stateless **tools** and stateful **resources**. GPT‑5 calls tools to mutate/query game state; resources stream snapshots (JSON) for grounding.

### 4.1 Transport

- HTTP POST for tool calls (`/mcp/tool/<name>`)
- WebSocket for bidirectional events (`/mcp/ws`)
- All calls include `sessionId` and `requestId` headers. Idempotency via `Idempotency-Key`.

### 4.2 Resources (GET)

- `resource:session.get` → `GET /mcp/session/:id`
- `resource:actors.list` → `GET /mcp/session/:id/actors`
- `resource:actor.get` → `GET /mcp/session/:id/actors/:actorId`
- `resource:combat.state` → `GET /mcp/session/:id/combat`
- `resource:deck.state` → `GET /mcp/session/:id/deck`
- `resource:logs.tail` → `GET /mcp/session/:id/logs?after=<ts>` (server‑sent events for stream)

### 4.3 Tools (POST) – JSON Schemas (abridged)

#### Session & State

- `session.create { name, grid, illumination, gmRole } → { sessionId }`
- `session.load { sessionId } → full snapshot`
- `session.update { patch } → snapshot`
- `session.end { reason }`

#### Actor Management

- `actor.upsert { actor } → actor`
- `actor.patch { actorId, patch } → actor`
- `actor.move { actorId, to:{x,y,facing}, reason }`
- `actor.applyEffect { actorId, effect:{type:'damage'|'healing'|'condition'|'resource', payload} }`
- `actor.rollTrait { actorId, trait:'Fighting'|..., mods:[...], rollMode:'open'|'secret' } → { dice, total, raises }`
- `actor.spendBenny { actorId, purpose }`
- `actor.adjustPP { actorId, delta, reason }`

#### Combat & Initiative

- `combat.start { sessionId, participants:[actorId], options } → state`
- `combat.deal { } → { dealt: {actorId: card} }`
- `combat.hold { actorId }`
- `combat.interrupt { actorId, targetActorId }`
- `combat.advanceTurn { } → state`
- `combat.endRound { } → state` (auto‑shuffle if a Joker was dealt previously)

#### Cards & Deck

- `deck.reset { useJokers:true }`
- `deck.deal { to:[actorId], extra: {actorId: n} }` (supports Edges like Level Headed / Quick)
- `deck.recall { actorId }`

#### Dice & RNG

- `dice.roll { formula:"2d6+1", explode:true, wildDie:"d6"|null, seed?:string } → { results, total, seed, hash }`
- `dice.verify { seed, results, hash } → bool`

#### Vision (Optional Hybrid)

- `vision.calibrate { gridCorners:[{x,y}...], cellSizeInches } → homography`
- `vision.reportPositions { actors:[{id, x, y, facing}] }` (called by vision client or GPT)
- `vision.detectDice { frameRef | dataUrl, kind:"pips|digits|percentile" } → { parsed }`

#### Rules Helpers

- `rules.applyDamage { attackerId, defenderId, damageRoll, ap } → { shaken?, woundsDelta, incapacitated? }`
- `rules.castPower { casterId, power, ppCost, shorting:int, modifiers:[], targets:[...] } → resolution`
- `rules.templateArea { origin:{x,y}, template:'SBT|MBT|LBT|Cone|Stream', angle } → { coveredCells:[...] }`

> All tool responses include a compact `delta` (CRDT‑style) so clients can patch local state and a full `serverTs`.

---

## 5) Combat Engine (State Machine)

**States**: `idle → round_start → turn_active(actor) ↔ on_hold* → turn_resolved → next_turn → round_end → round_start ...`

- **Deal Cards** at `round_start` (Wild Cards individually; Extras by group). Suit tiebreakers: Spades, Hearts, Diamonds, Clubs. Jokers grant +2 to Trait & damage and may act anytime; shuffle deck after any round where a Joker appears.
- **Hold**: an actor may move to `on_hold` to interrupt later; opposed check resolved on interrupt.
- **Advance Turn**: DO enforces single active actor; rejects concurrent `advance`.
- **End Round**: when all actor cards consumed (except holders), push holders to end in order; then rotate.

Durable Object `CombatDO` serializes mutations and records invariant checks.

---

## 6) Vision & Spatial Tracking

### 6.1 Table Calibration

- One‑time capture of top‑down frame → detect board corners → compute homography between camera pixels and grid coordinates.
- Manual fallback: admin tool marks 4 corners; server stores calibration by `sessionId`.

### 6.2 Miniature Tracking (two strategies)

1. **Fiducials (recommended):** Place AprilTags/ArUco rings or colored base bands on minis; detect IDs and poses; smooth with Kalman filter; map to actors.
2. **Direct detection:** Prompt GPT‑5 vision to tag minis (with name stickers) in the frame; reconcile with last state; server confirms legal moves.

### 6.3 Distances, Templates & Reach

- Server computes distances in squares/inches from stored positions.
- Template helper returns covered cells for SBT/MBT/LBT, Cone (45/90°), and Stream, plus Evasion targets.

---

## 7) Dice Pipelines

### 7.1 Virtual Dice

- DO `RngDO` uses crypto RNG for shuffle/roll; all results deterministically auditable via `{seed, results, hash}`.
- Supports exploding dice, Wild Die replacement, and grouped rolls.

### 7.2 Physical Dice via Camera

- "Dice Cam" stream or stills.
- Path A (vision‑LLM): send cropped frames; parse faces; cross‑validate across adjacent frames; accept on 2/3 consensus.
- Path B (classical CV fallback): grayscale → threshold → blob detect → pip count / OCR for digits; reject unclear frames; prompt re‑roll.
- Dispute protocol: GM can request a re‑read; human override via `dice.override` tool.

---

## 8) Rules Enforcement Primitives

> Provide _helpers_, not a full hard lock. GM (GPT‑5) stays in control.

- **Trait Rolls**: target number 4 by default; raises at +4; Wild Die logic; multi‑action penalties; advantages/penalties from status.
- **Damage**: compute Shaken/Wounds; Wound Cap; Soak eligible if Bennies available.
- **Initiative**: full 54‑card deck; Jokers special handling; group Extras; suit tiebreakers.
- **Bennies & Conviction**: track pools; Conviction adds +d6 to all Trait & damage until next turn; can be extended by Benny.
- **Powers/PP**: apply PP costs, maintenance, shorting penalties; per‑hour PP recharge; allow Benny‑based PP regain where applicable; per‑target maintenance cost.
- **Hold/Interrupt**: track who is On Hold; resolve interrupts as limited actions when legal.

All helpers return suggested consequences plus an _explain_ string so GPT‑5 can narrate.

---

## 9) Security, Privacy, Fairness

- **Auth:** JWT access tokens for human clients; model client identified by signed service token.
- **RBAC:** `gm`, `player`, `observer`; tool gatekeeping on role.
- **Tamper resistance:** all random events include provenance; append‑only ActionLog with SHA‑256 chains.
- **PII/Media:** no speech or frames stored by default; opt‑in snapshots to R2 for audits.
- **Rate limits:** per‑IP & per‑session; exponential backoff on contention.

---

## 10) Observability & Ops

- Structured logs; per‑tool timing; Worker traces.
- Metrics: rolls/second, card deals, interrupt latency, WS fan‑out, DO queue depth.
- Health: `/healthz`, `/readyz`; synthetic roll/deal tests.
- Backup: daily R2 export of D1; point‑in‑time deck snapshots each round.

---

## 11) API Examples

### 11.1 Deal Initiative

```http
POST /mcp/tool/combat.deal
{
  "sessionId":"S1",
  "extraDraws": {"actor:valeros":1}  // e.g., Level Headed
}
→
{
  "dealt": {"actor:valeros": {"rank":"K","suit":"Spades"}, "group:goblins": {"rank":"9","suit":"Hearts"}},
  "explain":"Dealt per Action Deck with Jokers present; shuffle flag false"
}
```

### 11.2 Physical Dice Parse

```http
POST /mcp/tool/vision.detectDice
{ "frameRef": "r2://spf-media/S1/dice/169221.png", "kind":"pips" }
→ { "parsed": {"d6":[6]} }
```

### 11.3 Cast Power (Shorted)

```http
POST /mcp/tool/rules.castPower
{ "casterId":"pc:seoni", "power":"healing", "ppCost":3, "shorting":3, "modifiers":[] }
→ { "roll": {"skill":"Faith","total":7,"mods":[-3]}, "criticalFailure":false, "fatigue":false }
```

---

## 12) Reference Data & Imports

- Seed the DB with Bestiary and Class Edge summaries (IDs only) to attach to NPCs.
- Optional importer from existing character sheets (CSV/JSON) with mapping DSL.

---

## 13) Client Surfaces

- **Voice‑only:** players use the ChatGPT app/device; the GM is GPT‑5.
- **Admin Panel (optional):** small web UI to view state, mark corners for calibration, force reshuffle, override reads.
- **Dice Cam widget:** minimal browser page that streams a cropped dice box.

_Natural Language intents (examples)_

- “GM, deal initiative for everyone; I have Level Headed.”
- “Put the three goblin Extras on one card.”
- “Move Valeros 6 inches to the south and face west.”
- “I roll Fighting at −2 for Wild Attack.”
- “Maintain protection on Seelah; spend the PP.”
- “I’m on Hold and will interrupt the ogre when he tries to move adjacent.”

---

## 14) Setup Steps (Cloudflare + MCP + Realtime)

### 14.1 Prerequisites

- Cloudflare account with Workers, D1, KV, DO, R2 enabled.
- OpenAI account with Realtime (Voice Mode) access.
- A standard 54‑card deck model (we store server‑side) and PNG assets (optional).

### 14.2 Bootstrap the Project

```bash
# Init
npm create cloudflare@latest spf-mcp
cd spf-mcp

# Add packages
npm i zod uuid jose @cloudflare/kv-asset-handler
npm i --save-dev wrangler typescript esbuild

# D1 / KV / R2 / DO
wrangler d1 create spf_db
wrangler kv namespace create SPFKV
wrangler r2 bucket create spf-media
# Durable Objects defined in wrangler.toml (CombatDO, DeckDO, RngDO, SessionDO)
```

**`wrangler.toml` (excerpt)**

```toml
name = "spf-mcp"
main = "dist/worker.js"
compatibility_date = "2025-09-01"

[[d1_databases]]
binding = "DB"
database_name = "spf_db"
database_id = "<id>"

[[kv_namespaces]]
binding = "SPFKV"
id = "<id>"

[[r2_buckets]]
binding = "R2"
bucket_name = "spf-media"

[[durable_objects.bindings]]
name = "CombatDO"
class_name = "CombatDO"

[[durable_objects.bindings]]
name = "DeckDO"
class_name = "DeckDO"

[[durable_objects.bindings]]
name = "RngDO"
class_name = "RngDO"

[[durable_objects.bindings]]
name = "SessionDO"
class_name = "SessionDO"
```

### 14.3 Database & Deployment

```bash
# Apply schema
wrangler d1 execute spf_db --file ./schema.sql

# Build & deploy
npm run build
wrangler deploy
```

### 14.4 Register the MCP Server

- Expose Worker routes: `https://<your-subdomain>.workers.dev/mcp/*`
- Provide OpenAPI‑like JSON describing tools/resources at `/mcp/manifest`.
- In your GPT configuration (Custom GPT / Connectors), add the MCP endpoint URL and credentials.

### 14.5 Wire Up Realtime Voice

- Build a tiny **local client** (Electron/Web) that:
  - Initiates a WebRTC session to GPT‑5 Realtime with mic + the Table Cam track.
  - Periodically posts calibration snapshots to the MCP `vision.calibrate`/`vision.reportPositions`.
  - Displays subtitles and turn prompts (optional).

### 14.6 Table Calibration

- Start a session; open Admin Panel → Calibration.
- Mark four board corners; set cell size; save.
- Assign actor tokens to minis (drag list → click mini in snapshot).

### 14.7 First Combat Dry‑Run

1. Create session; add 4 PCs and a group of 6 goblins.
2. `combat.start` → `combat.deal`.
3. Move minis on camera; confirm positions update.
4. Roll a few dice (virtual + physical) and confirm audit logs.

---

## 15) Edge Cases & Concurrency Rules

- Only **CombatDO** may advance `turn` or `round`; conflicting calls are queued.
- If voice parsing issues, GM can:
  - Ask for confirmation, or
  - Perform a safe default (e.g., “maintain last position”).

- Lost video: retain last valid positions; mark actors “vision‑stale.”
- Disputed dice: require second read or switch to virtual.
- Joker reshuffle policy: mark `lastJokerRound`; reshuffle at start of next round.

---

## 16) Testing Plan

- Unit tests for rule helpers (trait roll, damage, PP maintenance/shorting, AoE templates).
- Property tests for deck shuffles (Fisher‑Yates, uniformity), exploding dice math.
- Integration tests using DOs: multi‑client turn contention, Hold/interrupt.
- Vision tests with golden dice/minis frames.

---

## 17) Future Enhancements

- Cloudflare Calls (WebRTC relay) for multi‑camera rooms.
- Semantic scene memory (narrative recap) pinned to session timeline.
- Adventure module importer (encounters → seeded actors & terrain).
- Safety sandbox: “dry‑run” mode that annotates rules outcomes without committing state.

---

## 18) Deliverables

- Cloudflare Worker repo with:
  - MCP server (tools/resources), DO classes, D1 schema/migrations.
  - Admin Panel (optional) and Dice Cam widget.
  - Example Realtime Voice client seed project.

- Ops docs (runbooks), environment templates, and postmortem template.

---

### Appendix A – JSON: Full `Actor` Patch Example

```json
{
  "actorId": "pc:valeros",
  "patch": {
    "resources": { "bennies": 2 },
    "status": { "wounds": 2, "shaken": true },
    "position": { "x": 14, "y": 9, "facing": 270 }
  }
}
```

### Appendix B – RNG Output (Audit)

```json
{
  "seed": "0x8ae1…",
  "formula": "1d8!! + 1d6!! (wild)",
  "rolls": { "d8": [8, 3], "d6": [6, 2] },
  "total": 13,
  "hash": "sha256(seed||rolls)"
}
```

### Appendix C – Area Template Payload

```json
{
  "origin": { "x": 12, "y": 7 },
  "template": "Cone",
  "angle": 90,
  "reach": 9,
  "grid": "square",
  "snap": true
}
```
