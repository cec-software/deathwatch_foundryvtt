---
name: flamer-workflow-implementation
description: Flamer attack workflow redesign - single damage roll with multi-target application, animation on attack button, ammunition tracking
metadata:
  type: project
---

# Flamer Workflow Implementation

**Completed:** 2026-05-19

## Problem

Original flamer workflow rolled damage separately for each target, which was incorrect. Flamers fire a cone and should roll damage once, then apply that damage to all targets in the cone.

**Why:** Deathwatch RAW - flame weapons auto-hit all targets in a 30° cone. Each target gets an Agility dodge test and Catch Fire test, but the damage is rolled once per attack.

**How to apply:** When working with flame weapons or weapon qualities that affect multiple targets, consider whether damage should be rolled once (flamers, psychic blast) or per-target (standard multi-hit attacks).

## Solution

**New workflow:**
1. Attack button → rolls damage once, displays in chat with machine-readable metadata
2. Damage button → disabled for flamers (shows tooltip explaining workflow)
3. GM runs Flame Attack macro for each target in cone → applies pre-rolled damage

**Key architectural decision:** Maintain single combat entry point pattern. Use conditional logic within existing methods (`CombatRouter.executeAttack()`, `CombatHelper.weaponDamageRoll()`) rather than creating new methods.

## Implementation Details

### Combat Router
`src/module/helpers/combat/combat-router.mjs`

- `executeAttack()` detects flame quality and routes to `weaponDamageRoll()` with `isFlamerAttack: true` flag
- `executeDamage()` shows notification for flame weapons instead of opening damage dialog

### Damage Roll
`src/module/helpers/combat/combat.mjs`

`weaponDamageRoll()` with `isFlamerAttack` flag:
- Rolls damage once
- Creates chat message with 7 data attributes for macro parsing:
  - `data-flamer-damage` - rolled damage total
  - `data-flamer-pen` - penetration value
  - `data-flamer-type` - damage type (Energy)
  - `data-flamer-range` - weapon range in meters
  - `data-actor-id` - attacking actor ID
  - `data-weapon-name` - weapon name (sanitized)
  - `data-timestamp` - timestamp for uniqueness
- **Ammunition tracking:** Deducts 1 round from loaded ammo (skips hordes, respects clip management)
- **Animation:** Plays flame animation toward first targeted token if available (optional, like standard attacks)

### Macro Updates
`src/module/macros/flame-attack.mjs`

- `getRecentFlamerDamageRolls()` - Parses last 20 chat messages for flamer damage data
- Dropdown selector shows recent damage rolls with attacker name
- Removed animation invocations (moved to attack button)
- Removed AnimationHelper import (no longer needed)

### UI Updates
`src/templates/actor/parts/actor-items.html`

- Damage button conditionally disabled for flame weapons
- Tooltip explains workflow: "Use Attack button, then run Flame Attack macro"

`src/styles/components/items.css`

- Disabled button styling: opacity 0.5, cursor not-allowed, no pointer events

### Character Sheet
`src/module/sheets/shared/data-preparers/character-data-preparer.mjs`

- `prepareWeapons()` adds `hasFlame` flag to weapon data for template conditional

## Testing

**New test suite:** `tests/combat/flamer-attack-workflow.test.mjs`
- 10 tests covering routing, chat output, data attributes, ammunition deduction

**Enhanced suite:** `tests/macros/flame-attack.test.mjs`
- 14 tests for parser and dropdown functionality

**Total:** 138 suites, 2348 tests passing

## Files Modified

**Core logic:**
- `src/module/helpers/combat/combat-router.mjs`
- `src/module/helpers/combat/combat.mjs`
- `src/module/macros/flame-attack.mjs`

**UI:**
- `src/templates/actor/parts/actor-items.html`
- `src/styles/components/items.css`
- `src/module/sheets/shared/data-preparers/character-data-preparer.mjs`

**Tests:**
- `tests/combat/flamer-attack-workflow.test.mjs` (new)
- `tests/macros/flame-attack.test.mjs` (enhanced)

**Documentation:**
- `docs/macro-guide.md` (flamer workflow section added)

## Related Memories

- [[architecture]] - Single entry point pattern, helper organization
- [[testing_standards]] - TDD workflow used throughout implementation
- [[macro_system]] - Three-tier macro architecture context
