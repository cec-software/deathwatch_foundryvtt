# Flamer Workflow Manual Test Results

**Test Date:** [YYYY-MM-DD]  
**Tester:** [Name]  
**Foundry Version:** [e.g., v14.0.3]  
**System Version:** [e.g., 1.0.0]

---

## Test Environment Setup

- [ ] System installed and activated
- [ ] Test world created with Deathwatch system
- [ ] Flamecraft macro imported from compendium
- [ ] Test character created (Space Marine with Ballistic Skill 50+)
- [ ] Test enemies created (1 single target, 1 horde)

---

## Test Cases

### 1. Flamer Attack Button UI

**Objective:** Verify damage button is disabled for flame weapons and shows correct tooltip.

**Steps:**

1. Open character sheet with flamer equipped
2. Locate damage button in weapon controls

**Expected Results:**

- [ ] Damage button is disabled (grayed out, not clickable)
- [ ] Tooltip displays: "Flame weapons require template placement. Use Attack button to roll damage."
- [ ] Button styling matches design spec (opacity 0.5, no-drop cursor)

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

### 2. Flamer Attack Roll Output

**Objective:** Verify attack roll outputs damage but does not prompt for target selection.

**Steps:**

1. Open character sheet with flamer
2. Click Attack button
3. Observe chat output

**Expected Results:**

- [ ] Chat card displays weapon name and stats
- [ ] Damage is rolled and displayed
- [ ] No target selection prompt appears
- [ ] Chat card includes instruction: "Use Flame Attack macro to apply damage"

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

### 3. Flamecraft Macro - Single Target

**Objective:** Verify macro applies damage correctly to single enemy.

**Steps:**

1. Place template on canvas
2. Select single enemy token
3. Perform flamer attack (damage rolled to chat)
4. Run Flamecraft macro
5. Select flamer from dropdown
6. Click "Apply Damage"

**Expected Results:**

- [ ] Macro dialog opens with title "Flame Attack"
- [ ] Dropdown lists all flame weapons
- [ ] Correct damage value auto-populated from recent roll
- [ ] Single token receives full damage
- [ ] On Fire status effect applied (if applicable)
- [ ] Chat message confirms damage applied

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

### 4. Flamecraft Macro - Horde Target

**Objective:** Verify macro applies damage correctly to horde (PR 6 rule).

**Steps:**

1. Place template on canvas
2. Select horde token (magnitude 30+)
3. Perform flamer attack (damage rolled to chat)
4. Run Flamecraft macro
5. Select flamer from dropdown
6. Click "Apply Damage"

**Expected Results:**

- [ ] Macro detects horde target type
- [ ] Damage multiplied by 6 (PR 6 automatic)
- [ ] Horde magnitude reduced correctly
- [ ] On Fire status applied to horde
- [ ] Chat message shows: "Flame Attack (Horde: 6 hits)" or similar

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

### 5. Flamecraft Macro - Multiple Targets

**Objective:** Verify macro applies damage to all selected tokens.

**Steps:**

1. Place template covering 3+ tokens
2. Select all tokens within template
3. Perform flamer attack
4. Run Flamecraft macro
5. Apply damage

**Expected Results:**

- [ ] Macro processes all selected tokens
- [ ] Each token receives appropriate damage (singles full, hordes ×6)
- [ ] On Fire applied to all targets
- [ ] Chat messages generated for each target

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

### 6. Flamecraft Macro - No Recent Damage

**Objective:** Verify macro handles missing damage roll gracefully.

**Steps:**

1. Select target token(s)
2. Run Flamecraft macro WITHOUT rolling damage first
3. Observe error handling

**Expected Results:**

- [ ] Warning notification appears: "No recent damage rolls found"
- [ ] Macro exits gracefully without applying damage
- [ ] No errors in console

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

### 7. Flamecraft Macro - Wrong Weapon Selected

**Objective:** Verify macro handles incorrect weapon selection.

**Steps:**

1. Perform flamer attack (damage rolled)
2. Run Flamecraft macro
3. Select DIFFERENT flame weapon from dropdown (if available)
4. Click "Apply Damage"

**Expected Results:**

- [ ] Macro applies damage from selected weapon
- [ ] No errors or mismatches in output

**Actual Results:**

_[Record observations]_

**Status:** ☐ Pass ☐ Fail ☐ Partial

**Notes:**

---

## Regression Testing

### Non-Flame Weapons

**Objective:** Verify standard weapons still work correctly.

**Steps:**

1. Equip boltgun (non-flame)
2. Click damage button
3. Observe behavior

**Expected Results:**

- [ ] Damage button is enabled and clickable
- [ ] Standard damage roll dialog appears
- [ ] No flame workflow messages appear

**Status:** ☐ Pass ☐ Fail

**Notes:**

---

## Summary

**Total Tests:** 8  
**Passed:** [X]  
**Failed:** [X]  
**Partial:** [X]

**Critical Issues:**

_[List any blocking issues]_

**Minor Issues:**

_[List any cosmetic or non-blocking issues]_

**Recommendations:**

_[Suggestions for improvements]_

---

## Additional Notes

_[Any other observations, edge cases discovered, or suggestions]_
