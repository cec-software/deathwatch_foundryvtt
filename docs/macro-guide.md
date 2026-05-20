# Deathwatch Macro System Guide

This guide covers all three ways to use macros in the Deathwatch system.

## Quick Start

**New to macros?** Start here:
1. Open **Compendium Packs** → **Deathwatch: Macros**
2. Drag a macro (like "Quick Dodge") to your hotbar
3. Select your token and press the hotbar number

That's it! You now have instant combat reactions.

---

## Three Types of Macros

### 1. Drag-and-Drop Item Macros

Drag any item from a character sheet to your hotbar to create a macro.

**What you can drag:**
- **Weapons** → Opens attack dialog with all combat options
- **Psychic Powers** → Opens Focus Power Test dialog
- **Other Items** → Posts item description to chat

**Customization:** You can edit weapon macros to pre-load combat options (aim, rate of fire, called shots, etc.). See [hotbar-macros.md](hotbar-macros.md) for full details.

**Example:**
```javascript
// Pre-configured for Semi-Auto burst fire
game.deathwatch.rollItemMacro("Actor.xxx.Item.yyy", {
  rof: 1,
  skipDialog: true
});
```

### 2. Compendium Macros (Pre-Built)

Ready-to-use macros in **Compendium Packs** → **Deathwatch: Macros**.

**Available Macros:**

**Combat Reactions:**
- **Quick Dodge** - Instant Dodge roll (Agility skill)
- **Quick Parry** - Instant Parry roll (Weapon Skill)
- **Dodge or Parry** - Choose between them with modifiers
- **Defensive Stance** - Dodge/Parry with +20 bonus
- **Combat Reactions** - Advanced macro with auto-modifiers for talents, multiple attackers, etc.

**GM Macros:**
- **🔥 Flame Attack** - Handle flame weapon attacks (damage, dodge, catch fire)
- **🔥 On Fire Round** - Apply On Fire effects each round

**Usage:** Select a token, drag the macro to your hotbar, press the hotbar number.

See [macros-compendium.md](macros-compendium.md) for detailed guide.

### 3. Custom Scripted Macros

Write your own macros using the Deathwatch API.

**Basic Example:**
```javascript
const token = canvas.tokens.controlled[0];
if (!token) {
  ui.notifications.warn('Please select a token first');
  return;
}

// Roll a skill test
await game.deathwatch.rollSkill(token.actor.id, 'awareness', {
  modifier: 10,
  difficulty: 'Hard'
});
```

**Available APIs:**
- `game.deathwatch.rollSkill(actorId, skillName, options)` - Skill tests
- `game.deathwatch.rollCharacteristic(actorId, charKey, options)` - Characteristic tests
- `game.deathwatch.getDifficulties()` - Get difficulty presets
- `game.deathwatch.getCharacteristics()` - Get characteristic keys

See [macro-api.md](macro-api.md) for complete API reference with examples.

**Learning Resources:** Check out [example-macros/](example-macros/) for 10+ example scripts you can learn from and customize.

---

## Combat Reactions Reference

Dodge and Parry are the most common macros you'll use. Quick reference:

**Dodge** (Agility-based SKILL):
- Benefits from training (trained/expert/mastered)
- Use `rollSkill(actorId, 'dodge', options)`

**Parry** (Weapon Skill CHARACTERISTIC):
- Uses raw WS value only
- Use `rollCharacteristic(actorId, 'ws', options)`

**Common Modifiers:**
- Defensive Stance: +20
- Lightning Reflexes (Dodge): +10
- Blademaster (Parry): +10
- 2nd attacker this round: -20
- 3rd attacker: -40
- Called Shot attack: -20

See [combat-reactions-guide.md](combat-reactions-guide.md) for scenarios and detailed examples.

---

## Tips

**For Players:**
- Keep Quick Dodge and Quick Parry on your hotbar for fast reactions
- Drag commonly used weapons to hotbar for quick attacks
- Use Defensive Stance macro when outnumbered

**For GMs:**
- Use Flame Attack macro for flame weapons (handles all mechanics)
- Use On Fire Round macro to track burning characters
- Create custom macros for recurring situations (Fear tests, poison checks, etc.)

**For Everyone:**
- Press F12 to open browser console if something goes wrong
- The macro API validates your inputs and shows helpful error messages
- You can have multiple macros for the same weapon with different presets

---

## File Reference

| File | Purpose |
|------|---------|
| [macro-guide.md](macro-guide.md) | **This file** - Main overview and quick start |
| [macros-compendium.md](macros-compendium.md) | Guide to pre-built compendium macros |
| [hotbar-macros.md](hotbar-macros.md) | Drag-and-drop item macros and weapon presets |
| [macro-api.md](macro-api.md) | Complete API reference for custom scripts |
| [combat-reactions-guide.md](combat-reactions-guide.md) | Dodge/Parry mechanics and scenarios |
| [example-macros/](example-macros/) | Learning examples for custom macros |

---

## Flamer Workflow

Flame weapons (Heavy Flamer, Hand Flamer, etc.) use a special workflow because they fire a **cone** that automatically hits all targets within range.

### How It Works

1. **Attack Button** - Rolls damage once and displays in chat (no attack roll needed)
2. **Optional:** Target a token to play flame animation
3. **Ammunition Deducted** - 1 round consumed (if weapon has ammo management)
4. **Place Template** - Drag template from compendium to show cone area (optional visual aid)
5. **Flame Attack Macro** - Run for each target in cone, applies damage individually

### Step-by-Step Example

**Scenario:** Space Marine with Heavy Flamer attacks a group of Ork Boyz.

1. **Roll Damage (Once):**
   - Open character sheet
   - Optionally target first token for animation
   - Click **Attack** button on Heavy Flamer
   - Damage rolled to chat: "🔥 Flamer: Heavy Flamer - 25 damage, Pen 4"
   - Chat message includes machine-readable metadata for macro
   - Ammo deducted: 9 → 8 rounds remaining
   - Note: Damage button is disabled for flame weapons

2. **Place Template (Optional Visual Aid):**
   - Drag **Heavy Flamer** template from **Measured Templates** compendium to canvas
   - Position teardrop template to show 30° cone
   - GM determines which tokens are in cone

3. **Apply Damage (Per Target):**
   - Target first Ork token
   - Run **🔥 Flame Attack** macro from hotbar
   - Dropdown shows recent rolls: "Brother Marcus (25, Pen 4, Energy)"
   - Click **Burn** button
   - Target makes Agility dodge test
   - If failed: Takes full damage + Catch Fire test

4. **Repeat for Each Target:**
   - Target next Ork token
   - Run **🔥 Flame Attack** macro again
   - Same dropdown (uses already-rolled damage)
   - Each target gets individual dodge/catch fire tests

5. **Results:**
   - Single enemies: Individual damage application with dodge/catch fire tests
   - Hordes: ceil(range/4) + 1d5 hits, each dealing the rolled damage

### Special Rules

**Single Damage Roll:**
- Attack button rolls damage once
- Same damage value applied to all targets in cone
- No attack roll required (flames auto-hit within cone)

**Dodge Tests:**
- Each target makes individual Agility test to dodge
- Success: No damage taken
- Failure: Takes full damage and makes Catch Fire test

**Horde Hits:**
- Hordes take ceil(range/4) + 1d5 hits
- Each hit deals the rolled damage
- Example: Heavy Flamer (30m range) → ceil(30/4) + 1d5 = 8-12 hits

**On Fire Effect:**
- Failed Catch Fire test applies "On Fire" status
- Each round: 1d10 Energy damage (ignores armor/toughness) + 1 Fatigue
- Willpower test to act normally (Power Armour auto-passes)
- Agility test to extinguish (once per round)
- Use **🔥 On Fire Round** macro to automate

### Flame Attack Macro Features

**Recent Damage Dropdown:**
- Parses last 20 chat messages for flamer damage rolls
- Shows attacker name and damage values
- Example: "Brother Marcus (25, Pen 4, Energy)"
- Defaults to most recent roll

**Damage Source Selection:**
- Dropdown auto-populates with recent rolls
- Manual entry available if needed
- Parses damage, penetration, type, range from chat

**Per-Target Application:**
- Run macro once for each target in cone
- Target makes Agility dodge test
- If dodge fails: Apply damage + Catch Fire test
- Automatically detects horde vs individual target

**Horde Handling:**
- Calculates hits: ceil(range/4) + 1d5
- Applies batch damage with summary message
- No dodge test for hordes (auto-hit)

### Tips for GMs

**Targeting Workflow:**
- Target first token before clicking Attack (plays animation)
- After damage roll, target each enemy in cone individually
- Run Flame Attack macro once per target

**Template Placement:**
- Drag template from Measured Templates compendium (optional visual aid)
- Position to show 30° cone from attacker
- Use for determining which tokens are hit

**Damage Efficiency:**
- Damage rolled once, reused for all targets
- Dropdown remembers last 20 rolls for quick selection
- No need to re-roll or manually enter damage

**On Fire Management:**
- Macro applies "On Fire" status automatically on failed Catch Fire test
- Use **🔥 On Fire Round** macro at start of burning character's turn
- Track extinguish attempts (Agility test, 1 per round)

### Troubleshooting

**"No recent damage rolls found"**
- Click Attack button on flame weapon first
- Damage must be in last 20 chat messages
- Look for "🔥 Flamer:" message in chat

**Dropdown shows "Unknown"**
- Chat message missing actor ID (should not happen in current version)
- Use manual entry fields as fallback

**Damage not applying**
- Target token before running macro (blue highlight)
- Check token has actor assigned
- Verify actor has wounds/magnitude to modify

**Animation not playing**
- Target token before clicking Attack button
- Check Sequencer and JB2A modules are active
- Animation is optional, damage still works without it

---

## Need Help?

1. Check the specific guide for your use case (see File Reference above)
2. Look at [example-macros/](example-macros/) for working code samples
3. Press F12 to check browser console for error messages
4. File an issue on GitHub if you find a bug
