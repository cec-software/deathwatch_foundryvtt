# Combat System

## Combat Flow

### 1. Attack Roll → `ranged-combat.mjs` or `melee-combat.mjs`

- Opens dialog with modifiers (aim, range, rate of fire, etc.)
- Rolls 1d100 vs modified characteristic
- Computes DoS (Degrees of Success)
- Determines hit locations (single/multi-hit)
- Posts chat message with "Apply Damage" buttons

### 2. Damage Application → `combat.mjs` → `applyDamage()`

- Rolls damage (if not pre-rolled)
- Applies weapon qualities (Tearing, Melta, Force, etc.)
- Looks up armor by hit location
- Computes damage reduction (armor + TB + penetration)
- Applies wounds
- Checks for critical damage (wounds > max)
- Posts damage summary to chat

### 3. Weapon Qualities → `weapon-quality-helper.mjs`

- Each quality is a pure function: `applyQualityName(damageRoll, weaponData, attackData)`
- Called during damage roll or damage application phase
- Examples: Tearing (reroll 1s on damage dice), Accurate (+DoS to damage), Melta (2d10 at half range)

---

## Righteous Fury

**Ranged/Melee**: Roll 1d100 to confirm (target 95+). If confirmed, roll damage and crit.

**Deathwatch Training**: Auto-confirms Righteous Fury against xenos (no confirmation roll needed). Implemented in `righteous-fury-helper.mjs`.

---

## Psychic Powers

### Focus Power Test (`psychic-combat.mjs`)

1. Select power level (Fettered/Unfettered/Push)
2. Roll 1d100 vs WP + modifiers
3. Compute effective Psy Rating (PR): base PR + power level modifier (−1/0/+1)
4. On success: resolve power effect, roll damage if applicable
5. On failure: roll on Psychic Phenomena (d100) → may cascade to Perils of the Warp (d100)

**Tyranid psykers**: Use Hive Mind backlash (1d10 Energy damage) instead of Phenomena/Perils.

**Opposed tests**: Powers like Compel, Dominate, Mind Probe trigger opposed WP tests. Chat message includes "Oppose Test" button for target.

---

## Fire System

### Flame Weapons (weapon quality: `flame`)

**Workflow:**
1. Click Attack button → rolls damage once, displays in chat (no attack roll)
2. Optional: Target token to play animation (like standard attacks)
3. Ammunition deducted (1 round per shot, non-horde actors only)
4. GM runs Flame Attack macro for each target in cone
5. Each target makes Agility dodge test and Catch Fire test

**Combat routing:**
- `CombatRouter.executeAttack()` detects flame quality, routes to damage roll
- `CombatHelper.weaponDamageRoll()` with `isFlamerAttack: true` flag
- Damage button disabled for flame weapons (tooltip explains workflow)

**Damage application:**
- Individual targets: Agility dodge test → if failed, apply damage + catch fire test (AG)
- Hordes: ceil(range/4) + 1d5 hits, 1.5× multiplier

**Chat message metadata:**
- `data-flamer-damage`, `data-flamer-pen`, `data-flamer-type`, `data-flamer-range`
- `data-actor-id`, `data-weapon-name`, `data-timestamp`
- Parsed by Flame Attack macro for damage application

### On Fire Status

- Applied to token via `actor.setCondition('on-fire', true)`
- Each round on actor's turn: GM prompted to apply fire effects
- Fire effects (`applyOnFireEffects`): 1d10 Energy damage (ignores armor), +1 Fatigue, WP test to act normally
- Power Armor: Auto-passes WP test
- Extinguish test: AG − 20 (Hard), removes On Fire status on success

### Fire Macros

Available in the Macros compendium (Compendium Packs > Deathwatch: Macros):

- 🔥 Flame Attack — Dropdown selector shows recent flamer damage rolls, GM applies to targeted token
- 🔥 On Fire Round — GM targets token, applies On Fire effects for this round

**Flame Attack macro workflow:**
- Parses last 20 chat messages for `data-flamer-damage` attributes
- Dropdown shows attacker name and damage values (e.g., "Brother Marcus (10, Pen 4, Energy)")
- Defaults to most recent roll
- Manual entry still available if needed

---

## Hotbar Macros

### Drag & Drop from Character Sheet

- **Weapons** → Attack/Damage choice dialog (or pre-load options in macro command)
- **Psychic powers** → Opens Focus Power Test directly
- **Other items** → Generic item roll (posts description to chat)

**Macro presets**: Edit the macro command to pre-load attack options. See `docs/hotbar-macros.md` for full list of options.

---

_Combat protocols sanctified by the Machine God._ ⚙️
