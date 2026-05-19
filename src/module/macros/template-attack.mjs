import { evaluateFormula } from '../helpers/combat/formula-evaluator.mjs';
import { CombatHelper } from '../helpers/combat/combat.mjs';

/**
 * Calculate distance from template origin to token.
 * @param {MeasuredTemplate} template - The template document
 * @param {Token} token - The token object
 * @returns {number} Distance in meters
 */
function calculateTokenDistance(templateObject, token) {
  const dx = token.center.x - templateObject.document.x;
  const dy = token.center.y - templateObject.document.y;
  const distanceInUnits = Math.sqrt(dx * dx + dy * dy);

  // Convert grid units to meters
  const gridDistance = canvas.grid.distance || 1.5; // Default 1.5m per grid unit
  return distanceInUnits * gridDistance;
}

/**
 * Evaluate template configuration formulas.
 * @param {Item} item - Weapon or psychic power with template config
 * @param {Actor} actor - Source actor for formula evaluation
 * @returns {Object} Evaluated config { type, distance, angle }
 * @throws {Error} If formula evaluation fails
 */
export function evaluateTemplateConfig(item, actor) {
  const template = item.system.template;

  if (!template || !template.type || template.type === '') {
    throw new Error('Item has no template configuration');
  }

  const config = {
    type: template.type
  };

  // Evaluate distance formula
  if (template.distance && template.distance.trim() !== '') {
    config.distance = evaluateFormula(template.distance, actor);
  } else {
    config.distance = 0;
  }

  // Evaluate angle formula (only for cone templates)
  if (template.type === 'cone') {
    if (template.angle && template.angle.trim() !== '') {
      config.angle = evaluateFormula(template.angle, actor);
    } else {
      config.angle = 90; // Default cone angle
    }
  }

  return config;
}

/**
 * Main entry point for template attacks.
 * @param {Item} item - Weapon or psychic power with template config
 * @param {Actor} actor - Source actor (for formula evaluation)
 */
export async function templateAttack(item, actor) {
  try {
    // Step 1: Evaluate template configuration
    const config = evaluateTemplateConfig(item, actor);

    // Step 2: Show pre-placement dialog
    const userConfig = await showPrePlacementDialog(config);
    if (!userConfig) {
      ui.notifications.info('Template attack cancelled');
      return;
    }

    // Step 3: Place template
    const template = await placeTemplate({
      type: config.type,
      distance: userConfig.distance,
      angle: userConfig.angle
    });

    if (!template) {
      return; // User cancelled or placement failed
    }

    // Step 4: Roll damage
    const damageResult = await rollDamage(item, actor);

    // Step 5: Identify targets (need to get the rendered object)
    // v13: canvas.templates.get(id)
    // v14: template.object should already be available from AbilityTemplate
    const templateObject = template.object || canvas.templates?.get(template.id);
    if (!templateObject) {
      ui.notifications.error('Could not find rendered template');
      return;
    }

    // Ensure the template shape is generated
    if (!templateObject.shape) {
      await templateObject.renderFlags.set({ refreshShape: true });
      canvas.app.render();
      // Wait a tick for the shape to be calculated
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const targets = identifyTargets(templateObject);

    if (targets.pcs.length === 0 && targets.npcs.length === 0 && targets.hordes.length === 0) {
      ui.notifications.warn('No targets found in template area');
      return;
    }

    // Step 6: Show resolution dialog
    await showResolutionDialog(
      targets,
      damageResult.damage,
      damageResult.penetration,
      { damageType: damageResult.damageType },
      item
    );

  } catch (error) {
    ui.notifications.error(`Template attack failed: ${error.message}`);
    console.error('Template attack error:', error);
  }
}

/**
 * Show pre-placement configuration dialog.
 * @param {Object} config - Template config with evaluated formulas
 * @returns {Object|null} User-adjusted config or null if cancelled
 */
export async function showPrePlacementDialog(config) {
  const content = `
    <div class="form-group">
      <label>Range/Distance (meters):</label>
      <input type="number" id="template-distance" value="${config.distance}" min="0" />
    </div>
    ${config.type === 'cone' ? `
    <div class="form-group">
      <label>Angle (degrees):</label>
      <input type="number" id="template-angle" value="${config.angle}" min="0" max="360" />
    </div>
    ` : ''}
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: '🎯 Configure Template' },
    content,
    buttons: [
      {
        label: 'Place Template',
        action: 'place',
        callback: (event, button, dialog) => {
          const distance = parseInt(dialog.element.querySelector('#template-distance').value) || config.distance;
          const angle = config.type === 'cone'
            ? parseInt(dialog.element.querySelector('#template-angle')?.value) || config.angle
            : undefined;

          return { distance, angle };
        }
      },
      { label: 'Cancel', action: 'cancel' }
    ]
  });

  // DialogV2.wait returns null on cancel, or the callback result on action
  return result;
}

/**
 * Place template interactively on canvas using AbilityTemplate helper.
 * User can drag and rotate the template before confirming.
 *
 * @param {Object} config - Template configuration (type, distance, angle)
 * @returns {Promise<MeasuredTemplateDocument|null>} Placed template or null if cancelled
 */
export async function placeTemplate(config) {
  try {
    const AbilityTemplate = (await import('../canvas/ability-template.mjs')).default;
    const template = AbilityTemplate.fromConfig(config);
    const placedDoc = await template.drawPreview();
    return placedDoc;
  } catch (error) {
    console.error('Template placement error:', error);
    ui.notifications.error(`Template placement failed: ${error.message}`);
    return null;
  }
}

/**
 * Identify all tokens within template bounds.
 * Deduplicates Horde tokens by actor (multiple tokens = one entity).
 *
 * @param {MeasuredTemplate} templateObject - The rendered template object
 * @returns {Object} Categorized targets
 */
export function identifyTargets(templateObject) {
  const targets = { pcs: [], npcs: [], hordes: [] };
  const hordeMap = new Map(); // actor.id -> { actor, tokens[], distance }
  const tokensInTemplate = new Set();

  // Use geometry-based detection
  const doc = templateObject.document;
  const distance = doc.distance * (canvas.dimensions.size / canvas.dimensions.distance);

  console.log('Template detection:', {
    type: doc.t,
    x: doc.x,
    y: doc.y,
    distance: doc.distance,
    distancePixels: distance,
    direction: doc.direction,
    angle: doc.angle
  });

  for (const token of canvas.tokens.placeables) {
    if (!token.actor) continue;

    const dx = token.center.x - doc.x;
    const dy = token.center.y - doc.y;
    const distToToken = Math.sqrt(dx * dx + dy * dy);

    console.log(`Checking token ${token.name}:`, {
      center: token.center,
      dx, dy,
      distToToken,
      distanceLimit: distance
    });

    let isInside = false;

    if (doc.t === 'circle' && distToToken <= distance) {
      isInside = true;
    } else if (doc.t === 'cone') {
      // For cone: check distance AND angle
      if (distToToken <= distance) {
        const angle = Math.atan2(dy, dx);
        const normalizedAngle = (angle * 180 / Math.PI + 360) % 360;
        const direction = doc.direction || 0;
        const coneAngle = doc.angle || 90;

        let angleDiff = Math.abs(normalizedAngle - direction);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;

        console.log(`  Cone check:`, {
          tokenAngle: normalizedAngle.toFixed(1),
          coneDirection: direction,
          coneWidth: coneAngle,
          angleDiff: angleDiff.toFixed(1),
          maxDiff: (coneAngle / 2).toFixed(1)
        });

        if (angleDiff <= coneAngle / 2) {
          isInside = true;
        }
      }
    } else if (doc.t === 'ray') {
      // For ray: check if within width and distance
      if (distToToken <= distance) {
        isInside = true;
      }
    }

    if (isInside) {
      console.log(`  ✓ Token ${token.name} is INSIDE`);
      tokensInTemplate.add(token);
    }
  }

  console.log(`Found ${tokensInTemplate.size} tokens in template`);

  // Categorize tokens
  for (const token of tokensInTemplate) {

    // Categorize by actor type
    if (token.actor.hasPlayerOwner) {
      targets.pcs.push(token);
    } else if (token.actor.type === 'horde') {
      // Deduplicate horde tokens by actor
      const actorId = token.actor.id;
      const distance = calculateTokenDistance(templateObject, token);

      if (!hordeMap.has(actorId)) {
        hordeMap.set(actorId, {
          actor: token.actor,
          tokens: [token],
          distance: distance
        });
      } else {
        const entry = hordeMap.get(actorId);
        entry.tokens.push(token);
        // Update distance to closest token
        if (distance < entry.distance) {
          entry.distance = distance;
        }
      }
    } else {
      targets.npcs.push(token);
    }
  }

  // Convert horde map to array
  targets.hordes = Array.from(hordeMap.values());

  return targets;
}

/**
 * Roll damage and evaluate penetration for template attack.
 * @param {Item} item - Weapon or psychic power
 * @param {Actor} actor - Source actor
 * @returns {Object} {damage, penetration, damageType}
 */
export async function rollDamage(item, actor) {
  // Get damage formula
  const damageFormula = item.system.damageFormula || item.system.dmg || '0';
  const damageRoll = await new Roll(damageFormula).evaluate();

  // Evaluate penetration formula
  const penFormula = item.system.penetrationFormula || item.system.penetration || item.system.pen || '0';
  let penetration = 0;
  try {
    penetration = evaluateFormula(String(penFormula), actor);
  } catch (error) {
    // If formula evaluation fails, try parsing as literal number
    penetration = parseInt(penFormula) || 0;
  }

  // Get damage type
  const damageType = item.system.damageType || item.system.dmgType || 'Energy';

  return {
    damage: damageRoll.total,
    penetration,
    damageType
  };
}

/**
 * Handle horde batch damage application.
 * @param {Object} hordeData - Horde data {actor, tokens, distance}
 * @param {string} damageFormula - Damage formula to roll for each hit
 * @param {number} penetration - Penetration value
 * @param {string} damageType - Damage type
 */
async function handleHordeRoll(hordeData, damageFormula, penetration, damageType) {
  const { actor, distance } = hordeData;

  // Calculate hits: Math.ceil(distance / 4) + 1d5
  const staticHits = Math.ceil(distance / 4);
  const bonusRoll = await new Roll('1d5').evaluate();
  const totalHits = staticHits + bonusRoll.total;

  // Post hit calculation to chat
  await bonusRoll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    flavor: `<strong>🔥 Flame vs Horde: ${actor.name}</strong><br>
      Hits: ${staticHits} (range ${Math.round(distance)}/4) + ${bonusRoll.total} (1d5) = <strong>${totalHits} hits</strong>`
  });

  // Roll damage for each hit
  const hordeHitResults = [];
  for (let i = 0; i < totalHits; i++) {
    const damageRoll = await new Roll(damageFormula).evaluate();
    hordeHitResults.push({
      damage: damageRoll.total,
      penetration,
      location: 'Body',
      damageType
    });
  }

  // Apply batch damage
  await actor.system.receiveBatchDamage(hordeHitResults);
}

/**
 * Handle NPC Agility roll and damage application.
 * @param {Token} token - NPC token
 * @param {number} damage - Damage value
 * @param {number} penetration - Penetration value
 * @param {string} damageType - Damage type
 * @param {number} modifier - AG modifier
 */
async function handleNPCRoll(token, damage, penetration, damageType, modifier) {
  const ag = token.actor.system.characteristics?.ag?.value || 0;
  const targetNumber = ag + modifier;

  const roll = await new Roll('1d100').evaluate();
  const success = roll.total <= targetNumber;

  // Post roll to chat
  const flavor = `<strong>🔥 Dodge Flame: ${token.name}</strong><br>
    AG: ${ag} ${modifier >= 0 ? '+' : ''}${modifier} = ${targetNumber}<br>
    Rolled: ${roll.total} - ${success ? 'SUCCESS' : 'FAILED'}`;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: token.actor }),
    flavor
  });

  // Apply damage on failure
  if (!success) {
    const locRoll = await new Roll('1d100').evaluate();
    const location = CombatHelper.determineHitLocation(locRoll.total);

    await CombatHelper.applyDamage(token.actor, {
      damage,
      penetration,
      location,
      damageType,
      felling: 0,
      isPrimitive: false,
      isRazorSharp: false,
      degreesOfSuccess: 0,
      isScatter: false,
      isLongOrExtremeRange: false,
      isShocking: false,
      isToxic: false,
      isMeltaRange: false
    });
  }
}

/**
 * Build HTML for Horde section of resolution dialog.
 * @param {Array} hordes - Horde data array
 * @returns {string} HTML string
 */
export function buildHordeSection(hordes) {
  if (hordes.length === 0) return '';

  let html = '<div class="horde-section"><h4>Hordes:</h4><ul>';

  for (const horde of hordes) {
    const staticHits = Math.ceil(horde.distance / 4);
    const tokenCount = horde.tokens.length;
    const range = Math.round(horde.distance);

    html += `
      <li>
        <strong>${horde.actor.name}</strong> (Range: ${range}m) [${tokenCount} token${tokenCount > 1 ? 's' : ''} affected]<br>
        Hits = [${range}/4] + 1d5 = ${staticHits} + 1d5<br>
        <button class="horde-roll-btn" data-actor-id="${horde.actor.id}">Roll Damage</button>
      </li>
    `;
  }

  html += '</ul></div>';
  return html;
}

/**
 * Build HTML for NPC section of resolution dialog.
 * @param {Token[]} npcs - NPC tokens
 * @returns {string} HTML string
 */
export function buildNPCSection(npcs) {
  if (npcs.length === 0) return '';

  let html = '<div class="npc-section"><h4>NPCs/Enemies:</h4><table>';
  html += '<tr><th>Name</th><th>AG</th><th>Modifier</th><th>Action</th></tr>';

  for (const token of npcs) {
    const ag = token.actor.system.characteristics?.ag?.value || 0;
    html += `
      <tr data-token-id="${token.id}">
        <td>${token.name}</td>
        <td>${ag}</td>
        <td><input type="number" class="npc-modifier" value="0" style="width: 60px;" /></td>
        <td><button class="npc-roll-btn" data-token-id="${token.id}">Roll</button></td>
      </tr>
    `;
  }

  html += '</table></div>';
  return html;
}

/**
 * Build HTML for PC section of resolution dialog.
 * @param {Token[]} pcs - PC tokens
 * @param {number} damage - Damage value
 * @param {number} penetration - Penetration value
 * @param {string} damageType - Damage type
 * @returns {string} HTML string
 */
export function buildPCSection(pcs, damage, penetration, damageType) {
  if (pcs.length === 0) return '';

  let html = '<div class="pc-section"><h4>Player Characters (GM must notify):</h4><ul>';

  for (const token of pcs) {
    const ag = token.actor.system.characteristics?.ag?.value || 0;
    html += `<li>${token.name} (AG: ${ag}) - Notify player to roll Agility save</li>`;
  }

  html += `</ul><p><strong>Damage if failed: ${damage} (Pen ${penetration}, ${damageType})</strong></p></div>`;

  return html;
}

/**
 * Show target resolution dialog with damage application.
 * @param {Object} targets - Categorized targets
 * @param {number} damage - Rolled damage value
 * @param {number} penetration - Armor penetration
 * @param {Object} config - Attack config (damage type, etc.)
 * @param {Item} item - Weapon or psychic power (for damage formula)
 */
export async function showResolutionDialog(targets, damage, penetration, config, item) {
  // Build dialog content
  let content = `
    <div class="template-attack-resolution">
      <div class="damage-display">
        <h3>Damage: ${damage} (Pen ${penetration}, ${config.damageType})</h3>
      </div>
  `;

  // PC section
  if (targets.pcs.length > 0) {
    content += buildPCSection(targets.pcs, damage, penetration, config.damageType);
  }

  // NPC section
  if (targets.npcs.length > 0) {
    content += buildNPCSection(targets.npcs);
  }

  // Horde section
  if (targets.hordes.length > 0) {
    content += buildHordeSection(targets.hordes);
  }

  content += '</div>';

  await foundry.applications.api.DialogV2.wait({
    window: { title: '🎯 Template Attack Resolution' },
    content,
    buttons: [
      { label: 'Close', action: 'close' }
    ],
    rejectClose: false,
    render: (event, dialog) => {
      const html = dialog.element;

      // Attach NPC roll button handlers
      html.querySelectorAll('.npc-roll-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const tokenId = e.target.dataset.tokenId;
          const token = targets.npcs.find(t => t.id === tokenId);
          if (!token) return;

          const row = e.target.closest('tr');
          const modifier = parseInt(row.querySelector('.npc-modifier').value) || 0;

          await handleNPCRoll(token, damage, penetration, config.damageType, modifier);
        });
      });

      // Attach Horde roll button handlers
      html.querySelectorAll('.horde-roll-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const actorId = e.target.dataset.actorId;
          const horde = targets.hordes.find(h => h.actor.id === actorId);
          if (!horde) return;

          const damageFormula = item.system.damageFormula || item.system.dmg || '0';
          await handleHordeRoll(horde, damageFormula, penetration, config.damageType);
        });
      });
    }
  });
}
