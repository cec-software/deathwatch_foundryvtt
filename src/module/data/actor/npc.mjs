import DeathwatchActorBase from './base-actor.mjs';
import { ModifierCollector } from '../../helpers/character/modifier-collector.mjs';
import { SkillLoader } from '../../helpers/character/skill-loader.mjs';

const { fields } = foundry.data;

/**
 * NPC DataModel for neutral or allied non-player characters (Imperial Guard, civilians, etc.).
 *
 * Simplified character model for NPCs that don't need full PC features:
 * - **Has**: Characteristics, skills, wounds, fatigue, armor, weapons
 * - **No**: Biography, XP, rank, Psy Rating, fate points, renown
 *
 * Use this for:
 * - Imperial Guard officers and soldiers
 * - Civilian contacts and quest givers
 * - Neutral characters that may become enemies or allies
 * - NPCs with stats but no advancement system
 *
 * For hostile enemies, use Enemy or Horde instead.
 *
 * @extends {DeathwatchActorBase}
 * @example
 * // Imperial Guard Captain
 * const captain = game.actors.getName("Captain Vayne");
 * const bs = captain.system.characteristics.bs.value; // 40
 */
export default class DeathwatchNPC extends DeathwatchActorBase {

  // Note: Overrides base _characteristicFields() to include damage tracking
  static _characteristicFields() {
    return super._characteristicFields(true); // includeDamage = true for NPCs
  }

  static defineSchema() {
    const schema = super.defineSchema();

    schema.characteristics = new fields.SchemaField({
      ws: DeathwatchNPC._characteristicFields(),
      bs: DeathwatchNPC._characteristicFields(),
      str: DeathwatchNPC._characteristicFields(),
      tg: DeathwatchNPC._characteristicFields(),
      ag: DeathwatchNPC._characteristicFields(),
      int: DeathwatchNPC._characteristicFields(),
      per: DeathwatchNPC._characteristicFields(),
      wil: DeathwatchNPC._characteristicFields(),
      fs: DeathwatchNPC._characteristicFields()
    });

    schema.skills = new fields.ObjectField({ initial: {} });
    schema.modifiers = new fields.ArrayField(new fields.ObjectField(), { initial: [] });
    schema.conditions = new fields.ObjectField({ initial: {} });
    schema.description = new fields.HTMLField({ initial: "" });

    return schema;
  }

  prepareDerivedData() {
    const actor = this.parent;

    // Load skills
    this.skills = SkillLoader.loadSkills(this.skills);

    // Convert items Map to Array once (performance optimization)
    const itemsArray = this._getItemsArray();

    // Collect and apply modifiers
    const allModifiers = ModifierCollector.collectAllModifiers(actor, itemsArray);
    ModifierCollector.applyCharacteristicModifiers(this.characteristics, allModifiers);

    if (this.skills) {
      ModifierCollector.applySkillModifiers(this.skills, allModifiers);
    }

    this.initiativeBonus = ModifierCollector.applyInitiativeModifiers(allModifiers);
    ModifierCollector.applyWoundModifiers(this.wounds, allModifiers);
    ModifierCollector.applyFatigueModifiers(this.fatigue, this.characteristics?.tg?.mod || 0);
    ModifierCollector.applyArmorModifiers(itemsArray, allModifiers);
    this.naturalArmorValue = ModifierCollector.calculateNaturalArmor(allModifiers, itemsArray);

    // Apply weapon own modifiers after characteristics are computed
    for (const item of itemsArray) {
      if (item.type === 'weapon') {
        item.system._applyOwnModifiers();
      }
    }

    // Calculate movement from Agility Bonus
    const agBonus = this.characteristics?.ag?.mod || 0;
    if (!this.movement) this.movement = {};
    ModifierCollector.applyMovementModifiers(this.movement, agBonus, allModifiers);
  }
}
