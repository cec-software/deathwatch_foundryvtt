import { jest } from '@jest/globals';
import { DeathwatchActorSheetV2 } from '../../src/module/sheets/actor-sheet-v2.mjs';
import { ItemListPreparer } from '../../src/module/sheets/shared/data-preparers/item-list-preparer.mjs';
import { CharacterDataPreparer } from '../../src/module/sheets/shared/data-preparers/character-data-preparer.mjs';
import { SkillHelper } from '../../src/module/helpers/character/skill-helper.mjs';

global.duplicate = jest.fn((obj) => JSON.parse(JSON.stringify(obj)));

String.prototype.capitalize = String.prototype.capitalize || function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

describe('DeathwatchActorSheetV2', () => {
  let mockActor;

  beforeEach(() => {
    jest.clearAllMocks();

    global.game.deathwatch = {
      config: { CharacteristicWords: {}, Skills: {} },
      CombatRouter: {
        executeAttack: jest.fn(),
        executeDamage: jest.fn(),
      },
      CombatHelper: {
        clearJam: jest.fn(),
      },
    };
    global.CONFIG = {
      statusEffects: [
        { id: 'stunned', name: 'Stunned', img: 'icons/svg/daze.svg' }
      ]
    };

    mockActor = {
      _id: 'actor1',
      name: 'Test Marine',
      type: 'character',
      system: {
        characteristics: {
          ws: { value: 40, mod: 4 },
          bs: { value: 45, mod: 4 }
        },
        skills: {},
        modifiers: [],
        chapterId: '',
        specialtyId: '',
        rank: 1,
        xp: { total: 13000, spent: 0 },
        wounds: { value: 0, max: 20 },
        fatigue: { value: 0, max: 5 },
        renown: 0
      },
      items: {
        get: jest.fn(),
        filter: jest.fn(() => []),
        map: jest.fn(() => [])
      },
      effects: [],
      flags: {},
      toObject: jest.fn(() => ({
        type: 'character',
        system: mockActor.system,
        flags: {}
      })),
      getRollData: jest.fn(() => ({})),
      isOwner: true,
      hasCondition: jest.fn(() => false)
    };
  });

  describe('calculateSkillTotal', () => {
    it('calculates skill total for trained skill', () => {
      const skill = { characteristic: 'ws', trained: true, expert: false, mastered: false, modifier: 5 };
      const characteristics = { ws: { value: 40 } };
      expect(SkillHelper.calculateSkillTotal(skill, characteristics)).toBe(45);
    });

    it('calculates skill total for untrained skill', () => {
      const skill = { characteristic: 'ws', trained: false, expert: false, mastered: false, modifier: 0 };
      const characteristics = { ws: { value: 40 } };
      expect(SkillHelper.calculateSkillTotal(skill, characteristics)).toBe(20);
    });

    it('calculates skill total for mastered skill', () => {
      const skill = { characteristic: 'ws', trained: true, expert: false, mastered: true, modifier: 0 };
      const characteristics = { ws: { value: 40 } };
      expect(SkillHelper.calculateSkillTotal(skill, characteristics)).toBe(50);
    });

    it('calculates skill total for expert skill', () => {
      const skill = { characteristic: 'ws', trained: true, expert: true, mastered: false, modifier: 0 };
      const characteristics = { ws: { value: 40 } };
      expect(SkillHelper.calculateSkillTotal(skill, characteristics)).toBe(60);
    });
  });

  describe('renown rank (via CharacterDataPreparer)', () => {
    it('sets renownRank to Initiated for renown 0-19', () => {
      const context = { system: { characteristics: {}, skills: {}, renown: 10 } };
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.renownRank).toBe('Initiated');
    });

    it('sets renownRank to Respected for renown 20-39', () => {
      const context = { system: { characteristics: {}, skills: {}, renown: 30 } };
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.renownRank).toBe('Respected');
    });

    it('sets renownRank to Distinguished for renown 40-59', () => {
      const context = { system: { characteristics: {}, skills: {}, renown: 50 } };
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.renownRank).toBe('Distinguished');
    });

    it('sets renownRank to Famed for renown 60-79', () => {
      const context = { system: { characteristics: {}, skills: {}, renown: 70 } };
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.renownRank).toBe('Famed');
    });

    it('sets renownRank to Hero for renown 80+', () => {
      const context = { system: { characteristics: {}, skills: {}, renown: 90 } };
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.renownRank).toBe('Hero');
    });
  });

  describe('_prepareItems', () => {
    let sheet;

    beforeEach(() => {
      sheet = Object.create(DeathwatchActorSheetV2.prototype);
      // Set items.map to undefined so _prepareItems uses context.items directly
      mockActor.items.map = undefined;
      sheet.actor = mockActor;
    });

    it('categorizes weapons', () => {
      const context = {
        items: [
          { _id: 'w1', type: 'weapon', name: 'Bolter', img: 'icon.png', system: { equipped: false, loadedAmmo: null, modifiers: [] } }
        ]
      };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.weapons).toHaveLength(1);
      expect(context.weapons[0].name).toBe('Bolter');
    });

    it('categorizes armor', () => {
      const context = {
        items: [
          { _id: 'a1', type: 'armor', name: 'Power Armor', img: 'icon.png', system: { equipped: false, attachedHistories: [], modifiers: [] } }
        ]
      };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.armor).toHaveLength(1);
    });

    it('initializes empty arrays for all categories', () => {
      const context = { items: [] };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.weapons).toEqual([]);
      expect(context.armor).toEqual([]);
      expect(context.gear).toEqual([]);
      expect(context.ammunition).toEqual([]);
    });

    it('applies chapter talent cost overrides', () => {
      const context = {
        items: [
          { _id: 'tal1', type: 'talent', name: 'Test Talent', img: 'icon.png', system: { cost: 1000, compendiumId: 'tal00000000001' } }
        ],
        chapterTalentCosts: { 'tal00000000001': 500 },
        specialtyTalentCosts: {}
      };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.talents[0].system.effectiveCost).toBe(500);
    });

    it('applies specialty talent cost overrides (takes precedence over chapter)', () => {
      const context = {
        items: [
          { _id: 'tal1', type: 'talent', name: 'Test Talent', img: 'icon.png', system: { cost: 1000, compendiumId: 'tal00000000001', stackable: false } }
        ],
        chapterTalentCosts: { 'tal00000000001': 500 },
        specialtyTalentCosts: { 'tal00000000001': [300] }
      };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.talents[0].system.effectiveCost).toBe(300);
    });

    it('applies specialty base talent cost overrides', () => {
      const context = {
        items: [
          { _id: 'tal1', type: 'talent', name: 'Psy Rating 3', img: 'icon.png', system: { cost: -1, compendiumId: 'tal00000000275' } }
        ],
        chapterTalentCosts: {},
        specialtyBaseTalentCosts: { 'tal00000000275': 0 },
        specialtyTalentCosts: {}
      };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.talents[0].system.effectiveCost).toBe(0);
    });

    it('keeps base cost when no overrides match', () => {
      const context = {
        items: [
          { _id: 'tal1', type: 'talent', name: 'Test Talent', img: 'icon.png', system: { cost: 1000, compendiumId: 'tal00000000001' } }
        ],
        chapterTalentCosts: { 'tal00000000002': 500 },
        specialtyTalentCosts: { 'tal00000000003': 300 }
      };
      ItemListPreparer.prepare(context, mockActor);
      expect(context.talents[0].system.effectiveCost).toBe(1000);
    });
  });

  describe('_prepareCharacterData - showPsyRating', () => {
    let sheet;

    beforeEach(() => {
      sheet = Object.create(DeathwatchActorSheetV2.prototype);
      sheet.actor = mockActor;
    });

    it('sets showPsyRating true when specialty has hasPsyRating', () => {
      const context = {
        system: {
          characteristics: {},
          skills: {},
          chapterId: '',
          specialtyId: 'spec1',
          rank: 1,
          wounds: { value: 0, max: 20 },
          renown: 0
        }
      };
      mockActor.items.get.mockImplementation((id) => {
        if (id === 'spec1') return { _id: 'spec1', system: { hasPsyRating: true, talentCosts: {} } };
        return null;
      });
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.showPsyRating).toBe(true);
    });

    it('sets showPsyRating false when specialty does not have hasPsyRating', () => {
      const context = {
        system: {
          characteristics: {},
          skills: {},
          chapterId: '',
          specialtyId: 'spec1',
          rank: 1,
          wounds: { value: 0, max: 20 },
          renown: 0
        }
      };
      mockActor.items.get.mockImplementation((id) => {
        if (id === 'spec1') return { _id: 'spec1', system: { hasPsyRating: false, talentCosts: {} } };
        return null;
      });
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.showPsyRating).toBe(false);
    });

    it('sets showPsyRating false when no specialty assigned', () => {
      const context = {
        system: {
          characteristics: {},
          skills: {},
          chapterId: '',
          specialtyId: '',
          rank: 1,
          wounds: { value: 0, max: 20 },
          renown: 0
        }
      };
      CharacterDataPreparer.prepare(context, mockActor);
      expect(context.showPsyRating).toBe(false);
    });
  });

  describe('Action Handlers', () => {
    let sheet;
    let mockItem;

    beforeEach(() => {
      sheet = Object.create(DeathwatchActorSheetV2.prototype);
      sheet.actor = mockActor;

      mockItem = {
        _id: 'item1',
        name: 'Test Item',
        type: 'talent',
        system: { effect: '', modeRequirement: '', improvements: [] }
      };
      mockActor.items.get = jest.fn(() => mockItem);
    });

    describe('_onShowItem', () => {
      it('resolves item by data-item-id on target', () => {
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onShowItem.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });

      it('resolves item ID from closest parent when not on target', () => {
        const target = {
          dataset: {},
          closest: jest.fn(() => ({ dataset: { itemId: 'item1' } }))
        };
        DeathwatchActorSheetV2._onShowItem.call(sheet, {}, target);
        expect(target.closest).toHaveBeenCalledWith('[data-item-id]');
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });

      it('does nothing when item not found', () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { itemId: 'missing' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onShowItem.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('missing');
      });
    });

    describe('_onShowSpecialAbility', () => {
      it('posts mode activation message when ability has effect and modeRequirement', () => {
        mockItem.system = { effect: 'Some effect', modeRequirement: 'solo', improvements: [] };
        mockActor.system.rank = 1;
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };

        DeathwatchActorSheetV2._onShowSpecialAbility.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
        expect(ChatMessage.create).toHaveBeenCalled();
      });

      it('does not throw when no modeRequirement', () => {
        mockItem.system = { effect: '', modeRequirement: '', improvements: [] };
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onShowSpecialAbility.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });

      it('does nothing when item not found', () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { itemId: 'missing' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onShowSpecialAbility.call(sheet, {}, target);
      });
    });

    describe('_onActivateSquadAbility', () => {
      it('resolves ability by item ID', () => {
        // Mock game.settings.get for CohesionPanel.activateSquadAbility
        game.settings.get = jest.fn((ns, key) => {
          if (key === 'cohesion') return { value: 5, max: 5 };
          if (key === 'activeSquadAbilities') return [];
          return null;
        });
        mockItem.system = { cohesionCost: 1, sustained: false, effect: '', improvements: [] };
        mockActor.system.mode = 'squad';
        const target = { dataset: { itemId: 'item1' } };
        DeathwatchActorSheetV2._onActivateSquadAbility.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });
    });

    describe('_onUsePsychicPower', () => {
      it('resolves power by item ID', () => {
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onUsePsychicPower.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });
    });

    describe('_onEditItem', () => {
      it('opens item sheet by data-item-id', () => {
        const mockSheet = { render: jest.fn() };
        mockItem.sheet = mockSheet;
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onEditItem.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
        expect(mockSheet.render).toHaveBeenCalledWith(true);
      });

      it('resolves item ID from closest parent', () => {
        const mockSheet = { render: jest.fn() };
        mockItem.sheet = mockSheet;
        const target = {
          dataset: {},
          closest: jest.fn(() => ({ dataset: { itemId: 'item1' } }))
        };
        DeathwatchActorSheetV2._onEditItem.call(sheet, {}, target);
        expect(mockSheet.render).toHaveBeenCalledWith(true);
      });

      it('does nothing when item not found', () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { itemId: 'missing' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onEditItem.call(sheet, {}, target);
      });
    });

    describe('_onDeleteItem', () => {
      it('deletes item by data-item-id', async () => {
        mockItem.delete = jest.fn();
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        await DeathwatchActorSheetV2._onDeleteItem.call(sheet, {}, target);
        expect(mockItem.delete).toHaveBeenCalled();
      });

      it('does nothing when item not found', async () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { itemId: 'missing' }, closest: jest.fn() };
        await DeathwatchActorSheetV2._onDeleteItem.call(sheet, {}, target);
      });
    });

    describe('_onCreateItem', () => {
      it('creates item with correct type and name', async () => {
        global.Item = { create: jest.fn() };
        const target = { dataset: { type: 'weapon' } };
        await DeathwatchActorSheetV2._onCreateItem.call(sheet, {}, target);
        expect(global.Item.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'New Weapon', type: 'weapon' }),
          { parent: mockActor }
        );
      });
    });

    describe('_onToggleEquip', () => {
      it('toggles equipped state', async () => {
        mockItem.system.equipped = true;
        mockItem.update = jest.fn();
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        const event = { preventDefault: jest.fn() };
        await DeathwatchActorSheetV2._onToggleEquip.call(sheet, event, target);
        expect(mockItem.update).toHaveBeenCalledWith({ "system.equipped": false });
      });

      it('equips unequipped item', async () => {
        mockItem.system.equipped = false;
        mockItem.update = jest.fn();
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        const event = { preventDefault: jest.fn() };
        await DeathwatchActorSheetV2._onToggleEquip.call(sheet, event, target);
        expect(mockItem.update).toHaveBeenCalledWith({ "system.equipped": true });
      });
    });

    describe('_onWeaponAttack', () => {
      it('resolves weapon by item ID', () => {
        mockActor.getActiveTokens = jest.fn(() => []);
        mockItem.system.class = 'Basic';
        mockItem.system.attachedQualities = [];
        const target = { dataset: { itemId: 'item1' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onWeaponAttack.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });

      it('does nothing when weapon not found', () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { itemId: 'missing' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onWeaponAttack.call(sheet, {}, target);
      });
    });

    describe('_onWeaponDamage', () => {
      it('resolves weapon by item ID', () => {
        const target = { dataset: { itemId: 'item1' } };
        DeathwatchActorSheetV2._onWeaponDamage.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });
    });

    describe('_onWeaponUnjam', () => {
      it('resolves weapon by item ID', () => {
        const target = { dataset: { itemId: 'item1' } };
        DeathwatchActorSheetV2._onWeaponUnjam.call(sheet, {}, target);
        expect(mockActor.items.get).toHaveBeenCalledWith('item1');
      });
    });

    describe('_onRemoveAmmo', () => {
      it('unloads ammo from weapon', async () => {
        mockItem.update = jest.fn();
        const target = { dataset: { weaponId: 'item1' } };
        await DeathwatchActorSheetV2._onRemoveAmmo.call(sheet, {}, target);
        expect(mockItem.update).toHaveBeenCalledWith({ "system.loadedAmmo": null });
        expect(ui.notifications.info).toHaveBeenCalledWith('Ammunition removed.');
      });

      it('does nothing when weapon not found', async () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { weaponId: 'missing' } };
        await DeathwatchActorSheetV2._onRemoveAmmo.call(sheet, {}, target);
      });
    });

    describe('_onEditAmmo', () => {
      it('opens ammo item sheet', () => {
        const mockSheet = { render: jest.fn() };
        mockItem.sheet = mockSheet;
        const target = { dataset: { itemId: 'item1' } };
        const event = { stopPropagation: jest.fn() };
        DeathwatchActorSheetV2._onEditAmmo.call(sheet, event, target);
        expect(mockSheet.render).toHaveBeenCalledWith(true);
        expect(event.stopPropagation).toHaveBeenCalled();
      });
    });

    describe('_onRemoveUpgrade', () => {
      it('removes upgrade from weapon', async () => {
        mockItem.system.attachedUpgrades = [{ id: 'upg1' }, { id: 'upg2' }];
        mockItem.update = jest.fn();
        const target = { dataset: { upgradeId: 'upg1', weaponId: 'item1' } };
        await DeathwatchActorSheetV2._onRemoveUpgrade.call(sheet, {}, target);
        expect(mockItem.update).toHaveBeenCalledWith({
          "system.attachedUpgrades": [{ id: 'upg2' }]
        });
        expect(ui.notifications.info).toHaveBeenCalledWith('Weapon upgrade removed.');
      });

      it('does nothing when weapon not found', async () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { upgradeId: 'upg1', weaponId: 'missing' } };
        await DeathwatchActorSheetV2._onRemoveUpgrade.call(sheet, {}, target);
      });
    });

    describe('_onRollSkill (validation)', () => {
      it('warns when skill not found', async () => {
        mockActor.system.skills = {};
        const target = { dataset: { skill: 'nonexistent', label: 'Nonexistent' } };
        await DeathwatchActorSheetV2._onRollSkill.call(sheet, {}, target);
        expect(ui.notifications.warn).toHaveBeenCalledWith('Skill nonexistent not found');
      });

      it('warns when untrained advanced skill', async () => {
        mockActor.system.skills = {
          forbidden_lore: { isBasic: false, trained: false, characteristic: 'int' }
        };
        const target = { dataset: { skill: 'forbidden_lore', label: 'Forbidden Lore' } };
        await DeathwatchActorSheetV2._onRollSkill.call(sheet, {}, target);
        expect(ui.notifications.warn).toHaveBeenCalledWith(
          'Forbidden Lore is an advanced skill and must be trained to use.'
        );
      });
    });

    describe('_onCreateModifier', () => {
      it('delegates to ModifierHelper', () => {
        mockActor.update = jest.fn();
        DeathwatchActorSheetV2._onCreateModifier.call(sheet, {}, {});
        expect(mockActor.update).toHaveBeenCalled();
      });
    });

    describe('_onEditModifier', () => {
      it('resolves modifier ID from target', () => {
        const target = { dataset: { modifierId: 'mod1' }, closest: jest.fn() };
        DeathwatchActorSheetV2._onEditModifier.call(sheet, {}, target);
      });

      it('resolves modifier ID from closest parent', () => {
        const target = {
          dataset: {},
          closest: jest.fn(() => ({ dataset: { modifierId: 'mod1' } }))
        };
        DeathwatchActorSheetV2._onEditModifier.call(sheet, {}, target);
        expect(target.closest).toHaveBeenCalledWith('.modifier');
      });
    });

    describe('_onRemoveChapter', () => {
      it('deletes chapter item and clears chapterId', async () => {
        const mockChapter = { delete: jest.fn() };
        mockActor.system.chapterId = 'ch1';
        mockActor.items.get = jest.fn(() => mockChapter);
        mockActor.update = jest.fn();
        await DeathwatchActorSheetV2._onRemoveChapter.call(sheet, {}, {});
        expect(mockChapter.delete).toHaveBeenCalled();
        expect(mockActor.update).toHaveBeenCalledWith({ "system.chapterId": "" });
        expect(ui.notifications.info).toHaveBeenCalledWith('Chapter removed.');
      });

      it('clears chapterId even when no chapter item found', async () => {
        mockActor.system.chapterId = '';
        mockActor.update = jest.fn();
        await DeathwatchActorSheetV2._onRemoveChapter.call(sheet, {}, {});
        expect(mockActor.update).toHaveBeenCalledWith({ "system.chapterId": "" });
      });
    });

    describe('_onRemoveSpecialty', () => {
      it('deletes specialty item and clears specialtyId', async () => {
        const mockSpecialty = { delete: jest.fn() };
        mockActor.system.specialtyId = 'sp1';
        mockActor.items.get = jest.fn(() => mockSpecialty);
        mockActor.update = jest.fn();
        await DeathwatchActorSheetV2._onRemoveSpecialty.call(sheet, {}, {});
        expect(mockSpecialty.delete).toHaveBeenCalled();
        expect(mockActor.update).toHaveBeenCalledWith({ "system.specialtyId": "" });
        expect(ui.notifications.info).toHaveBeenCalledWith('Specialty removed.');
      });
    });

    describe('_onRemoveHistory', () => {
      it('removes history from armor', async () => {
        mockItem.system.attachedHistories = ['hist1', 'hist2'];
        mockItem.update = jest.fn();
        const target = { dataset: { historyId: 'hist1', armorId: 'item1' } };
        await DeathwatchActorSheetV2._onRemoveHistory.call(sheet, {}, target);
        expect(mockItem.update).toHaveBeenCalledWith({
          "system.attachedHistories": ['hist2']
        });
        expect(ui.notifications.info).toHaveBeenCalledWith('Armor history removed.');
      });

      it('does nothing when armor not found', async () => {
        mockActor.items.get = jest.fn(() => null);
        const target = { dataset: { historyId: 'hist1', armorId: 'missing' } };
        await DeathwatchActorSheetV2._onRemoveHistory.call(sheet, {}, target);
      });
    });

    describe('_onRender', () => {
      let sheet, mockHtml, mockDescriptionTab, mockSubtabsNav;

      beforeEach(() => {
        sheet = new DeathwatchActorSheetV2({ document: mockActor });

        // Mock Foundry's Tabs class
        global.foundry = global.foundry || {};
        global.foundry.applications = global.foundry.applications || {};
        global.foundry.applications.ux = global.foundry.applications.ux || {};
        global.foundry.applications.ux.Tabs = jest.fn().mockImplementation(() => ({
          bind: jest.fn(),
          activate: jest.fn()
        }));

        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn(cb => cb());

        mockDescriptionTab = {
          querySelector: jest.fn(),
          querySelectorAll: jest.fn(() => [
            { dataset: { tab: 'bio' }, addEventListener: jest.fn() }
          ])
        };

        mockSubtabsNav = {
          classList: { contains: jest.fn() }
        };

        mockHtml = {
          querySelector: jest.fn(),
          querySelectorAll: jest.fn((selector) => {
            if (selector === '.sheet-tabs .item') return [{ dataset: { tab: 'characteristics' }, addEventListener: jest.fn() }];
            if (selector === 'input[type="text"], input[type="number"]') return [];
            if (selector === '.section-header') return [];
            return [];
          })
        };

        // Set sheet.element to mockHtml (since _onRender uses this.element)
        sheet.element = mockHtml;

        // Set sheet.actor (used in _onRender)
        sheet.actor = mockActor;
        mockActor.getFlag = jest.fn(() => ({}));
      });

      it('should not initialize character subtabs when character-subtabs nav is missing', () => {
        mockActor.type = 'enemy';

        // Mock description tab exists but no character-subtabs nav (like enemy sheet)
        mockHtml.querySelector.mockImplementation((selector) => {
          if (selector === '.tab[data-tab="description"]') return mockDescriptionTab;
          return null;
        });
        mockDescriptionTab.querySelector.mockReturnValue(null); // No .character-subtabs

        // Should not throw error when character-subtabs nav is missing
        sheet._onRender({}, mockHtml);

        // Should have initialized main tabs (once) but NOT character subtabs
        expect(global.foundry.applications.ux.Tabs).toHaveBeenCalledTimes(1); // Only main tabs
        expect(sheet._characterSubTabs).toBeUndefined();
      });

      it('should initialize character subtabs for character actor with character-subtabs nav', () => {
        mockActor.type = 'character';

        // Mock description tab WITH character-subtabs nav (like character sheet)
        mockHtml.querySelector.mockImplementation((selector) => {
          if (selector === '.tab[data-tab="description"]') return mockDescriptionTab;
          return null;
        });
        mockDescriptionTab.querySelector.mockImplementation((selector) => {
          if (selector === '.character-subtabs') return mockSubtabsNav;
          return null;
        });

        // Should initialize tabs successfully
        sheet._onRender({}, mockHtml);

        // Debug: check what was called
        expect(mockHtml.querySelector).toHaveBeenCalledWith('.tab[data-tab="description"]');
        expect(mockDescriptionTab.querySelector).toHaveBeenCalledWith('.character-subtabs');

        // Should have initialized character subtabs
        expect(sheet._characterSubTabs).toBeDefined();
        expect(global.foundry.applications.ux.Tabs).toHaveBeenCalledTimes(2); // Main tabs + character subtabs
      });
    });
  });
});
