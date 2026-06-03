---
name: animation-system
description: Animation hook architecture for weapon attacks - how data-attack-type prevents dual-firing animations
metadata:
  type: reference
---

## Animation System Architecture

### Chat Message Data Attributes

Combat helpers (RangedCombatHelper, MeleeCombatHelper, PsychicCombatHelper) create chat messages with `data-attack-type` attribute:

- **`"ranged"`** — Guns (bolters, las, plasma, melta)
  - AnimationHook plays weapon animation via Sequencer + JB2A
  - Classification: `AnimationHelper.classifyWeapon()` based on name/damage type

- **`"grenade"`** — Thrown weapons and grenades
  - GrenadeHelper plays multi-stage grenade animation explicitly
  - AnimationHook skips these (no dual-firing)

- **`"melee"`** — Melee weapons
  - Automated Animations module handles via item animation key
  - AnimationHook skips these

- **`"psychic"`** — Psychic powers
  - Automated Animations module handles via power animation key
  - AnimationHook skips these

### AnimationHook Behavior

**File:** `src/module/hooks/animation-hook.mjs`

**Rule:** Only processes `attackType === 'ranged'` (line 53). No default fallback.

```javascript
// Correct: Explicit check, exits early for all non-ranged
if (attackType !== 'ranged') {
  return;
}

// WRONG: Default fallback causes dual-firing
const attackType = attackDiv.dataset.attackType || 'ranged'; // ❌
```

### Weapon Class Detection

**File:** `src/module/helpers/combat/ranged-combat.mjs` (lines 855-858)

```javascript
const weaponClass = weapon.system.class?.toLowerCase() || '';
const isGrenade = weaponClass.includes('thrown') || weaponClass.includes('grenade');
const attackType = isGrenade ? 'grenade' : 'ranged';
```

**Pattern:** Case-insensitive substring matching for weapon class.

### Preventing Dual-Firing Bugs

**Why:** When `data-attack-type` is missing, AnimationHook would default to ranged animation. If GrenadeHelper also plays animation, BOTH fire.

**Fix:** Always set explicit `data-attack-type` in chat message content:
```html
<div class="dw-attack-roll"
  data-attack-type="grenade"  <!-- REQUIRED -->
  data-actor-id="..."
  data-item-id="...">
```

**Related:** [[testing_standards]] for TDD approach, [[systematic-debugging]] for root cause analysis
