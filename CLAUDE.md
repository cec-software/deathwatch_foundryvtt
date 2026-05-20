# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Documentation Structure

This project uses a three-tier documentation system:

- **CLAUDE.md** (this file) → Quick start + essential commands + pointers to detailed docs
- **[.claude/memory/](.claude\memory\MEMORY.md)** → Session learnings, workflow preferences, project history (evolves over time)
- **[.claude/docs/](.claude\docs\README.md)** → Deep-dive developer reference documentation (loaded on demand)
- **[docs/](docs/)** → User-facing guides for GMs and players (not for Claude)

**When to read what:**

- Starting a session? Read this file (CLAUDE.md)
- Working on a specific subsystem? Read the relevant `.claude/docs/` file
- Need workflow context? Check `.claude/memory/` files
- User documentation? Check `docs/` (macro guides, etc.)

---

## System Overview

This is a **Foundry VTT v13-v14 game system** for Warhammer 40,000: Deathwatch RPG. It implements:

- 4 actor types (Character, NPC, Enemy, Horde) with full combat mechanics
- 17 item types covering weapons, armor, talents, psychic powers, etc.
- 18 pre-built compendium packs with 800+ items, actors, and measured templates
- Complex combat system with 24+ weapon qualities, Righteous Fury, critical damage
- Cohesion & Kill-team system with Solo/Squad Mode abilities
- Psychic powers with Phenomena/Perils and Tyranid Hive Mind backlash
- Fire mechanics (On Fire status, flame weapons, extinguish tests)
- Insanity & Corruption tracking with chapter-specific curses
- **Measured Templates compendium** — Pre-configured drag-and-drop templates for flamers, grenades, and psychic blasts

---

## Quick Start

**Prerequisites**: Node.js v24+ (tested on v24.13.0)

```bash
npm install                 # Install dependencies
npm test                    # Verify installation (2354 tests should pass)
npm run build:all           # Build packs and deploy locally (requires .env setup)
```

**First-time setup**: Create `.env` file with `LOCAL_DIR` pointing to your Foundry systems directory:

```
LOCAL_DIR=C:\Users\YourName\AppData\Local\FoundryVTT\Data\systems\deathwatch
```

**See [.claude/docs/build-deploy.md](.claude/docs/build-deploy.md) for detailed build commands and deployment setup.**

---

## Essential Commands

### Testing

```bash
npm test                                          # Run all tests
npm test -- tests/combat/combat.test.mjs          # Run specific test file
npm test -- --testPathPattern="weapon-qualities"  # Run pattern match
npm run test:coverage                             # Generate coverage report
```

### Build & Deploy

```bash
npm run format:json         # Format compendium JSON files
npm run build:packs         # Validate + compile packs to LevelDB
npm run build:copy          # Deploy to local Foundry (see .env)
npm run build:all           # build:packs + build:copy
```

**See [.claude/docs/build-deploy.md](.claude/docs/build-deploy.md) for complete command reference.**

---

## Developer Reference Documentation

**Location**: `.claude/docs/` - Deep-dive reference docs loaded on demand

| Topic               | File                                                          | When to Read                      |
| ------------------- | ------------------------------------------------------------- | --------------------------------- |
| **Getting Started** | [build-deploy.md](.claude/docs/build-deploy.md)               | Setup, commands, deployment       |
| **Foundry API**     | [foundry-api.md](.claude/docs/foundry-api.md)                 | TextEditor, ApplicationV2, sheets |
| **Architecture**    | [architecture.md](.claude/docs/architecture.md)               | DataModels, helpers, init pattern |
| **Combat**          | [combat-system.md](.claude/docs/combat-system.md)             | Combat flow, weapon qualities     |
| **Character**       | [modifiers.md](.claude/docs/modifiers.md)                     | Modifiers, cybernetics, ranks     |
| **Squad System**    | [cohesion-squad.md](.claude/docs/cohesion-squad.md)           | Cohesion, Solo/Squad Mode         |
| **Mental State**    | [insanity-corruption.md](.claude/docs/insanity-corruption.md) | IP/CP tracking, curses            |
| **Testing**         | [testing.md](.claude/docs/testing.md)                         | Jest, TDD workflow, coverage      |
| **Code Quality**    | [coding-standards.md](.claude/docs/coding-standards.md)       | CSS, error handling, logging      |
| **Patterns**        | [item-patterns.md](.claude/docs/item-patterns.md)             | Item identification, key field    |
| **Data**            | [compendium.md](.claude/docs/compendium.md)                   | Pack system, ID conventions       |
| **Infrastructure**  | [foundry-adapter.md](.claude/docs/foundry-adapter.md)         | FoundryAdapter, testability       |
| **Constants**       | [constants.md](.claude/docs/constants.md)                     | Magic number elimination          |
| **Migrations**      | [migration-system.md](.claude/docs/migration-system.md)       | Data versioning, upgrades         |

**See [.claude/docs/README.md](.claude/docs/README.md) for full documentation index.**

---

## Memory System

**Location**: `.claude/memory/` (version controlled)

This project uses Claude Code's persistent memory system to capture:

- **Feedback** — Development preferences and lessons learned
- **Project history** — Significant implementations and their context
- **Reference** — Quick-lookup information

**Key memories:**

- [MEMORY.md](.claude/memory/MEMORY.md) — Memory index (start here)
- [testing_standards.md](.claude/memory/testing_standards.md) — TDD workflow and test coverage goals
- [feedback_code_quality.md](.claude/memory/feedback_code_quality.md) — Logger usage, import discipline
- [project_tdd_example.md](.claude/memory/project_tdd_example.md) — Reference TDD implementation (XP calculator)
- [architecture.md](.claude/memory/architecture.md) — TypeDataModel pattern, helper organization, FoundryAdapter
- [development_workflow.md](.claude/memory/development_workflow.md) — Git conventions, build/test commands
- [compendium_system.md](.claude/memory/compendium_system.md) — Pack workflow, ID conventions, validation
- [macro_system.md](.claude/memory/macro_system.md) — Three-tier macro architecture, RollExecutor pattern
- [feedback_characteristic_damage_migration.md](.claude/memory/feedback_characteristic_damage_migration.md) — Use system.modifiers for characteristic penalties

**When to update memory:**

- Capture significant implementation patterns
- Document lessons learned from debugging sessions
- Record workflow preferences discovered during development
- Press `#` during a Claude session to have Claude auto-incorporate learnings

**Note:** Memory files are version controlled and shared with the repository. User-specific preferences should stay in `~/.claude/CLAUDE.md` (global defaults).

---

## Architecture Quick Reference

### Socket Communication Pattern

**Player actions on GM-owned actors** require socket routing (Foundry document permissions):

```javascript
// Check permissions first
const canUpdate =
  game.user.isGM || actor.testUserPermission(game.user, "OWNER");

if (!canUpdate) {
  // Route through socket - GM will execute with their permissions
  game.socket.emit("system.deathwatch", {
    type: "actionType",
    actorId: actor.id,
    data: {
      /* action data */
    }
  });
  return;
}

// Direct execution (user has permission)
await actor.system.doSomething(data);
```

**Socket handler (GM-only):**

```javascript
game.socket.on("system.deathwatch", async (data) => {
  if (data.type === "actionType" && game.user.isGM) {
    const actor = game.actors.get(data.actorId);
    await actor.system.doSomething(data.data);
  }
});
```

See `src/module/init/socket.mjs` for registered handlers.

### Foundry v13-v14 TypeDataModel Pattern

- **DataModel classes** (`src/module/data/`) define schemas and derived data
- **Document classes** (`src/module/documents/`) are thin shells that delegate to DataModels
- **Initialization** (`src/module/init/`) uses modular pattern with static `register()` methods

**See [.claude/docs/architecture.md](.claude/docs/architecture.md) for detailed architecture documentation.**

### Helper Organization

- **Combat** (`src/module/helpers/combat/`) — Pure combat logic, weapon qualities, damage
- **Character** (`src/module/helpers/character/`) — Modifiers, XP, ranks, wounds
- **UI** (`src/module/helpers/ui/`) — Chat messages, templates, dialogs
- **Core** (`src/module/helpers/`) — Logger, error handler, validation, FoundryAdapter

**All helpers are pure functions (testable without Foundry globals).**

### Key Patterns

- **FoundryAdapter** — All Foundry API calls routed through adapter for testability ([foundry-adapter.md](.claude/docs/foundry-adapter.md))
- **Item Keys** — Never match by ID/name, use `key` field ([item-patterns.md](.claude/docs/item-patterns.md))
- **Constants** — No magic numbers, use constants from `src/module/helpers/constants/` ([constants.md](.claude/docs/constants.md))
- **Error Handling** — Wrap event listeners with `ErrorHandler.wrap()` ([coding-standards.md](.claude/docs/coding-standards.md))
- **Logging** — Use `Logger.category('X.Y').debug()` for subsystem logs or `Logger.debug()` for one-off messages. Never use `console.*` ([coding-standards.md](.claude/docs/coding-standards.md))

---

## Testing Philosophy

**Prefer Test-Driven Development (TDD)** when implementing features or fixing bugs.

1. Write failing test first
2. Implement minimal fix
3. Verify all tests pass
4. Refactor if needed

**Expected results:** 139 test suites, 2354 passing tests (as of 2026-05-20)

**See [.claude/docs/testing.md](.claude/docs/testing.md) and [.claude/memory/testing_standards.md](.claude/memory/testing_standards.md) for complete testing documentation.**

---

## Git Branch Strategy

**Main branch**: `main`  
**Development branch**: `claude`

When creating PRs, target the `main` branch.

---

## System Notes

- **Foundry version**: Supports v13 and v14 (tested on v14.x, uses v14 Region API for templates)
- **Grid**: 3 meters per square (metric)
- **Token bars**: Primary = Wounds, Secondary = Fatigue
- **Initiative formula**: `1d10 + @agBonus + @initiativeBonus`
- **Enemy auto-folder**: New Enemy/Horde actors auto-move to "Enemies" folder
- **Skip Defeated**: Combat tracker defaults to skipping defeated combatants
- **Measured Templates**: Drag from "Measured Templates" compendium to canvas. Templates are pre-configured for common weapons (flamers, grenades) and psychic powers. GM determines which tokens are hit.

---

## Need More Detail?

- **Architecture deep-dive?** → [.claude/docs/architecture.md](.claude/docs/architecture.md)
- **Combat mechanics?** → [.claude/docs/combat-system.md](.claude/docs/combat-system.md)
- **Testing approach?** → [.claude/docs/testing.md](.claude/docs/testing.md)
- **Coding standards?** → [.claude/docs/coding-standards.md](.claude/docs/coding-standards.md)
- **All developer docs** → [.claude/docs/README.md](.claude/docs/README.md)

_The Machine Spirit stands ready to serve. Praise the Omnissiah._ ⚙️
