---
name: psychic-flame-powers
description: Psychic powers can have flame quality (Avenger) and use flamer workflow after Focus Power Test
metadata:
  type: project
---

# Psychic Flame Powers Implementation

**Completed:** 2026-05-19

## Problem

Avenger psychic power description states it "works exactly like a shot from an Adeptus Astartes heavy flamer" but used standard psychic damage flow, not the flamer workflow.

**Why:** Avenger fires a cone that hits multiple targets with single damage roll, just like physical flamers. Should use same workflow for consistency.

**How to apply:** Psychic powers can have `flame` quality in `attachedQualities` array. When detected, route through flamer workflow after successful Focus Power Test.

## Solution

Psychic powers with flame quality use flamer workflow:
1. Focus Power Test (normal psychic flow)
2. On success: Create flamer-style chat message with damage/pen/type/range
3. GM selects token in cone and runs Flame Attack macro (same as weapons)
4. Repeat for each selected token in cone
5. Animation plays toward first targeted token (optional)

## Implementation Details

### Avenger Power Data
`src/packs-source/psychic-powers/Codex/avenger.json`

Added flame quality:
```json
"attachedQualities": [{ "id": "flame" }]
```

### Psychic Combat Helper
`src/module/helpers/combat/psychic-combat.mjs`

Modified `_rollPsychicDamage()`:
- Detects `hasFlame` quality at line 640
- Routes to flamer chat message creation (lines 644-693)
- Creates chat message with same data attributes as weapon flamers
- Plays animation if target selected
- Returns early (skips standard damage flow)

**Chat message format:**
```html
<div class="flamer-damage-roll"
     data-flamer-damage="${damage}"
     data-flamer-pen="${penetration}"
     data-flamer-type="${damageType}"
     data-flamer-range="${range}"
     data-actor-id="${actor.id}"
     data-weapon-name="${powerName}"
     data-timestamp="${timestamp}">
  <h3>🔥 Psychic Flame: Avenger</h3>
  ...
</div>
```

### Penetration Bug Fix

**Pre-existing bug discovered:** Penetration calculation used `parseInt(this.substitutePR("2*PR", 4))` which returned 2 instead of 8.

**Root cause:** `parseInt("2*4")` stops at `*` character, doesn't evaluate arithmetic.

**Fix:** Use `Function()` constructor to safely evaluate arithmetic expressions:
```javascript
const penFormula = this.substitutePR(power.system.penetrationFormula, effectivePR);
penetration = Function(`'use strict'; return (${penFormula})`)();
```

Falls back to `parseInt()` for simple numbers if evaluation fails.

### Macro Compatibility

Flame Attack macro already compatible - parses `data-flamer-*` attributes from chat, works identically for weapons and psychic powers.

Dropdown shows source as "Brother Marcus (22, Pen 8, Energy)" regardless of whether source is weapon or power.

## Testing

**New test suite:** `tests/combat/psychic-flamer-workflow.test.mjs`
- 5 tests covering Avenger flame workflow
- Verifies chat message format
- Tests PR substitution in penetration
- Tests range extraction
- Verifies non-flame powers use standard flow

**Total:** 139 suites, 2353 tests passing (+5 new tests)

## Files Modified

**Core logic:**
- `src/module/helpers/combat/psychic-combat.mjs` (flame detection + bug fix)
- `src/packs-source/psychic-powers/Codex/avenger.json` (added flame quality)

**Tests:**
- `tests/combat/psychic-flamer-workflow.test.mjs` (new)

**Documentation:**
- `README.md` (flame weapons & powers section)
- `.claude/docs/combat-system.md` (psychic flame powers section)
- `docs/macro-guide.md` (psychic flame workflow)

## Related Memories

- [[flamer_workflow_implementation]] - Base flamer workflow this extends
- [[architecture]] - Combat routing pattern
- [[testing_standards]] - TDD approach used
