import { jest } from '@jest/globals';
import { ChatButtonHandlers } from '../../src/module/chat/button-handlers.mjs';
import { CombatHelper } from '../../src/module/helpers/combat/combat.mjs';
import { PsychicCombatHelper } from '../../src/module/helpers/combat/psychic-combat.mjs';
import { CriticalEffectsHelper } from '../../src/module/helpers/combat/critical-effects.mjs';
import { FireHelper } from '../../src/module/helpers/combat/fire-helper.mjs';
import { CohesionHelper } from '../../src/module/helpers/cohesion.mjs';
import { MODIFIER_TYPES } from '../../src/module/helpers/constants/modifier-constants.mjs';

/**
 * Tests for ChatButtonHandlers
 *
 * This test suite covers the button handler registration and actor resolution
 * logic. Individual button click handlers are tested via mocked DOM elements
 * and FoundryAdapter calls.
 */
describe('ChatButtonHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure foundry.utils.escapeHTML is available (needed by Sanitizer)
    if (!global.foundry) {
      global.foundry = {};
    }
    if (!global.foundry.utils) {
      global.foundry.utils = {};
    }
    global.foundry.utils.escapeHTML = jest.fn((text) => {
      if (typeof text !== 'string') return text;
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    });
    global.foundry.utils.randomID = jest.fn(() => 'random-id-123');
  });

  /* -------------------------------------------- */
  /*  _resolveActor                               */
  /* -------------------------------------------- */

  describe('_resolveActor', () => {
    it('should resolve synthetic token actor when sceneId and tokenId provided', () => {
      const mockTokenActor = { id: 'token-actor-1', name: 'Token Actor' };
      const mockTokenDoc = { actor: mockTokenActor };
      const mockScene = {
        tokens: {
          get: jest.fn(() => mockTokenDoc)
        }
      };

      global.game.scenes = {
        get: jest.fn(() => mockScene)
      };

      const button = {
        dataset: {
          sceneId: 'scene-123',
          tokenId: 'token-456',
          targetId: 'actor-789'
        }
      };

      const result = ChatButtonHandlers._resolveActor(button);

      expect(result).toBe(mockTokenActor);
      expect(global.game.scenes.get).toHaveBeenCalledWith('scene-123');
      expect(mockScene.tokens.get).toHaveBeenCalledWith('token-456');
    });

    it('should fallback to game actor when no token data provided', () => {
      const mockActor = { id: 'actor-789', name: 'Base Actor' };

      global.game.actors = {
        get: jest.fn(() => mockActor)
      };

      const button = {
        dataset: {
          targetId: 'actor-789'
        }
      };

      const result = ChatButtonHandlers._resolveActor(button);

      expect(result).toBe(mockActor);
      expect(global.game.actors.get).toHaveBeenCalledWith('actor-789');
    });

    it('should fallback to game actor when scene not found', () => {
      const mockActor = { id: 'actor-789', name: 'Base Actor' };

      global.game.scenes = {
        get: jest.fn(() => null)
      };
      global.game.actors = {
        get: jest.fn(() => mockActor)
      };

      const button = {
        dataset: {
          sceneId: 'invalid-scene',
          tokenId: 'token-456',
          targetId: 'actor-789'
        }
      };

      const result = ChatButtonHandlers._resolveActor(button);

      expect(result).toBe(mockActor);
      expect(global.game.actors.get).toHaveBeenCalledWith('actor-789');
    });

    it('should fallback to game actor when token not found', () => {
      const mockActor = { id: 'actor-789', name: 'Base Actor' };
      const mockScene = {
        tokens: {
          get: jest.fn(() => null)
        }
      };

      global.game.scenes = {
        get: jest.fn(() => mockScene)
      };
      global.game.actors = {
        get: jest.fn(() => mockActor)
      };

      const button = {
        dataset: {
          sceneId: 'scene-123',
          tokenId: 'invalid-token',
          targetId: 'actor-789'
        }
      };

      const result = ChatButtonHandlers._resolveActor(button);

      expect(result).toBe(mockActor);
      expect(global.game.actors.get).toHaveBeenCalledWith('actor-789');
    });

    it('should return null when no actor found', () => {
      global.game.actors = {
        get: jest.fn(() => null)
      };

      const button = {
        dataset: {
          targetId: 'invalid-actor'
        }
      };

      const result = ChatButtonHandlers._resolveActor(button);

      expect(result).toBeNull();
    });

    it('should use custom actorIdAttr parameter', () => {
      const mockActor = { id: 'actor-custom', name: 'Custom Actor' };

      global.game.actors = {
        get: jest.fn(() => mockActor)
      };

      const button = {
        dataset: {
          attackerId: 'actor-custom'
        }
      };

      const result = ChatButtonHandlers._resolveActor(button, 'attackerId');

      expect(result).toBe(mockActor);
      expect(global.game.actors.get).toHaveBeenCalledWith('actor-custom');
    });

    it('should return null when actorIdAttr not present in dataset', () => {
      global.game.actors = {
        get: jest.fn(() => null)
      };

      const button = {
        dataset: {}
      };

      const result = ChatButtonHandlers._resolveActor(button, 'missingAttr');

      expect(result).toBeNull();
    });
  });

  /* -------------------------------------------- */
  /*  _registerApplyDamageButton                  */
  /* -------------------------------------------- */

  describe('_registerApplyDamageButton', () => {
    let mockButton, mockHtml;

    beforeEach(() => {
      mockButton = {
        dataset: {
          damage: '15',
          penetration: '4',
          location: 'Body',
          damageType: 'Impact',
          isPrimitive: 'false',
          isRazorSharp: 'false',
          degreesOfSuccess: '2',
          isScatter: 'false',
          isLongOrExtremeRange: 'false',
          isShocking: 'false',
          isToxic: 'false',
          isMeltaRange: 'false',
          magnitudeBonusDamage: '0',
          ignoresNaturalArmour: 'false',
          criticalDamageBonus: '0',
          targetId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Test Actor',
          type: 'character',
          system: { wounds: { value: 10, max: 20 } }
        }))
      };

      jest.spyOn(CombatHelper, 'applyDamageWithPermissionCheck').mockResolvedValue(undefined);
      jest.spyOn(CohesionHelper, 'shouldTriggerCohesionDamage').mockReturnValue(false);
    });

    it('should register click event listener on apply-damage-btn', () => {
      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.apply-damage-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should call CombatHelper.applyDamageWithPermissionCheck with correct parameters on click', async () => {
      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CombatHelper.applyDamageWithPermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-123' }),
        expect.objectContaining({
          damage: 15,
          penetration: 4,
          location: 'Body',
          damageType: 'Impact',
          felling: 0,
          isPrimitive: false,
          isRazorSharp: false,
          degreesOfSuccess: 2,
          isScatter: false,
          isLongOrExtremeRange: false,
          isShocking: false,
          isToxic: false,
          isMeltaRange: false,
          magnitudeBonusDamage: 0,
          ignoresNaturalArmour: false,
          criticalDamageBonus: 0
        })
      );
    });

    it('should handle tokenInfo when sceneId and tokenId provided', async () => {
      mockButton.dataset.sceneId = 'scene-456';
      mockButton.dataset.tokenId = 'token-789';

      const mockTokenActor = {
        id: 'token-actor-1',
        name: 'Token Actor',
        type: 'character',
        system: { wounds: { value: 5, max: 15 } }
      };

      global.game.scenes = {
        get: jest.fn(() => ({
          tokens: {
            get: jest.fn(() => ({ actor: mockTokenActor }))
          }
        }))
      };

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CombatHelper.applyDamageWithPermissionCheck).toHaveBeenCalledWith(
        mockTokenActor,
        expect.objectContaining({
          tokenInfo: { sceneId: 'scene-456', tokenId: 'token-789' }
        })
      );
    });

    it('should handle characteristic damage effect when provided', async () => {
      mockButton.dataset.charDamageFormula = '1d5';
      mockButton.dataset.charDamageChar = 'ag';
      mockButton.dataset.charDamageName = 'Toxic Effect';

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CombatHelper.applyDamageWithPermissionCheck).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          charDamageEffect: {
            formula: '1d5',
            characteristic: 'ag',
            name: 'Toxic Effect'
          }
        })
      );
    });

    it('should handle Force weapon data when isForce is true', async () => {
      mockButton.dataset.isForce = 'true';
      mockButton.dataset.forceAttackerId = 'psyker-123';
      mockButton.dataset.forcePsyRating = '5';

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CombatHelper.applyDamageWithPermissionCheck).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          forceWeaponData: {
            attackerId: 'psyker-123',
            psyRating: 5
          }
        })
      );
    });

    it('should trigger cohesion damage for qualifying weapons on character', async () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Character',
        type: 'character',
        system: { wounds: { value: 10, max: 20 } }
      };

      global.game.actors.get.mockReturnValue(mockActor);
      mockButton.dataset.weaponQualities = JSON.stringify(['blast']);
      CohesionHelper.shouldTriggerCohesionDamage.mockReturnValue(true);
      jest.spyOn(CohesionHelper, 'handleCohesionDamage').mockResolvedValue(undefined);

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CohesionHelper.shouldTriggerCohesionDamage).toHaveBeenCalledWith(15, ['blast']);
      expect(CohesionHelper.handleCohesionDamage).toHaveBeenCalledWith(
        expect.stringContaining('Test Character took 15 raw damage')
      );
    });

    it('should not trigger cohesion damage for non-character actors', async () => {
      const mockActor = {
        id: 'enemy-123',
        name: 'Test Enemy',
        type: 'enemy',
        system: { wounds: { value: 10, max: 20 } }
      };

      global.game.actors.get.mockReturnValue(mockActor);
      jest.spyOn(CohesionHelper, 'handleCohesionDamage').mockResolvedValue(undefined);

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CohesionHelper.handleCohesionDamage).not.toHaveBeenCalled();
    });

    it('should set canApply data attribute to true when user is GM', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: false
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: true
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(true);
    });

    it('should set canApply data attribute to true when user is actor owner', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: true
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(true);
    });

    it('should set canApply data attribute to false when user lacks permissions', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: false
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(false);
    });

    it('should set canApply to false when target actor not found', () => {
      global.game.actors.get.mockReturnValue(null);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(false);
    });

    it('should set canApply to true for non-owner when restrictApplyDamageButton is false', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: false
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => false) // restrictApplyDamageButton = false
      };

      ChatButtonHandlers._registerApplyDamageButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(true);
    });
  });

  /* -------------------------------------------- */
  /*  _registerShockingTestButton                 */
  /* -------------------------------------------- */

  describe('_registerShockingTestButton', () => {
    let mockButton, mockHtml, mockRoll;

    beforeEach(() => {
      mockButton = {
        dataset: {
          armorValue: '8',
          stunRounds: '2',
          actorId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      mockRoll = {
        total: 50,
        toMessage: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn(async function() {
          return this;
        })
      };

      global.Roll = jest.fn(() => mockRoll);

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Test Actor',
          system: {
            characteristics: {
              tg: { value: 40 }
            }
          }
        }))
      };

      global.ChatMessage.getSpeaker.mockReturnValue({ alias: 'Test Actor' });
      global.game.settings.get.mockReturnValue('roll');
    });

    it('should register click event listener on shocking-test-btn', () => {
      ChatButtonHandlers._registerShockingTestButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.shocking-test-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should calculate target number from TG + armor bonus', async () => {
      ChatButtonHandlers._registerShockingTestButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      // TG 40 + (armor 8 * 10) = 120
      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('Target: 120 (TG 40 + 80 armor bonus)')
        })
      );
    });

    it('should post success message when roll ≤ target', async () => {
      mockRoll.total = 100;

      ChatButtonHandlers._registerShockingTestButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('SUCCESS - Not Stunned')
        })
      );
    });

    it('should post failure message with stun rounds when roll > target', async () => {
      mockRoll.total = 150;

      ChatButtonHandlers._registerShockingTestButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('FAILED - Stunned for 2 rounds!')
        })
      );
    });
  });

  /* -------------------------------------------- */
  /*  _registerToxicTestButton                    */
  /* -------------------------------------------- */

  describe('_registerToxicTestButton', () => {
    let mockButton, mockHtml, mockRoll, mockToxicRoll;

    beforeEach(() => {
      mockButton = {
        dataset: {
          penalty: '10',
          actorId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      mockRoll = {
        total: 50,
        toMessage: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn(async function() {
          return this;
        })
      };

      mockToxicRoll = {
        total: 7,
        toMessage: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn(async function() {
          return this;
        })
      };

      let callCount = 0;
      global.Roll = jest.fn(() => {
        callCount++;
        return callCount === 1 ? mockRoll : mockToxicRoll;
      });

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Test Actor',
          system: {
            characteristics: {
              tg: { value: 40 }
            },
            wounds: { value: 5, max: 20 }
          },
          update: jest.fn().mockResolvedValue(undefined)
        }))
      };

      global.ChatMessage.getSpeaker.mockReturnValue({ alias: 'Test Actor' });
      global.game.settings.get.mockReturnValue('roll');
    });

    it('should register click event listener on toxic-test-btn', () => {
      ChatButtonHandlers._registerToxicTestButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.toxic-test-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should calculate target number from TG − penalty', async () => {
      ChatButtonHandlers._registerToxicTestButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      // TG 40 - penalty 10 = 30
      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('Target: 30 (TG 40 - 10 penalty)')
        })
      );
    });

    it('should post success message when roll ≤ target', async () => {
      mockRoll.total = 25;

      ChatButtonHandlers._registerToxicTestButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('SUCCESS - No Additional Damage')
        })
      );
    });

    it('should roll toxic damage on failure and update wounds', async () => {
      mockRoll.total = 50;
      mockToxicRoll.total = 7;

      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        system: {
          characteristics: { tg: { value: 40 } },
          wounds: { value: 5, max: 20 }
        },
        update: jest.fn().mockResolvedValue(undefined)
      };

      global.game.actors.get.mockReturnValue(mockActor);

      ChatButtonHandlers._registerToxicTestButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockActor.update).toHaveBeenCalledWith({ 'system.wounds.value': 12 });
      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('FAILED - Takes 7 Impact Damage')
        })
      );
    });
  });

  /* -------------------------------------------- */
  /*  _registerCharDamageButton                   */
  /* -------------------------------------------- */

  describe('_registerCharDamageButton', () => {
    let mockButton, mockHtml, mockRoll;

    beforeEach(() => {
      mockButton = {
        dataset: {
          formula: '1d5',
          characteristic: 'ag',
          name: 'Toxic Effect',
          actorId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      mockRoll = {
        total: 3,
        toMessage: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn(async function() {
          return this;
        })
      };

      global.Roll = jest.fn(() => mockRoll);

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Test Actor',
          system: {
            modifiers: []
          },
          update: jest.fn().mockResolvedValue(undefined)
        }))
      };

      global.ChatMessage.getSpeaker.mockReturnValue({ alias: 'Test Actor' });
      global.game.settings.get.mockReturnValue('roll');
    });

    it('should register click event listener on char-damage-btn', () => {
      ChatButtonHandlers._registerCharDamageButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.char-damage-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should roll damage formula and create new modifier', async () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        system: { modifiers: [] },
        update: jest.fn().mockResolvedValue(undefined)
      };

      global.game.actors.get.mockReturnValue(mockActor);

      ChatButtonHandlers._registerCharDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockActor.update).toHaveBeenCalledWith({
        'system.modifiers': [
          {
            _id: 'random-id-123',
            name: 'Toxic Effect',
            modifier: -3,
            type: MODIFIER_TYPES.CIRCUMSTANCE,
            modifierType: 'constant',
            effectType: 'characteristic',
            valueAffected: 'ag',
            enabled: true,
            source: 'Characteristic Damage'
          }
        ]
      });
    });

    it('should accumulate damage to existing modifier', async () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        system: {
          modifiers: [
            {
              _id: 'existing-id',
              name: 'Toxic Effect',
              modifier: -2,
              type: MODIFIER_TYPES.CIRCUMSTANCE,
              modifierType: 'constant',
              effectType: 'characteristic',
              valueAffected: 'ag',
              enabled: true,
              source: 'Characteristic Damage'
            }
          ]
        },
        update: jest.fn().mockResolvedValue(undefined)
      };

      global.game.actors.get.mockReturnValue(mockActor);
      mockRoll.total = 3;

      ChatButtonHandlers._registerCharDamageButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockActor.update).toHaveBeenCalledWith({
        'system.modifiers': [
          {
            _id: 'existing-id',
            name: 'Toxic Effect',
            modifier: -5, // -2 + -3 = -5
            type: MODIFIER_TYPES.CIRCUMSTANCE,
            modifierType: 'constant',
            effectType: 'characteristic',
            valueAffected: 'ag',
            enabled: true,
            source: 'Characteristic Damage'
          }
        ]
      });
    });
  });

  /* -------------------------------------------- */
  /*  _registerRollCriticalButton                 */
  /* -------------------------------------------- */

  describe('_registerRollCriticalButton', () => {
    let mockButton, mockHtml;

    beforeEach(() => {
      mockButton = {
        dataset: {
          location: 'Body',
          damageType: 'Energy',
          actorId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Test Actor'
        }))
      };

      jest.spyOn(CriticalEffectsHelper, 'applyCriticalEffect').mockResolvedValue(undefined);
    });

    it('should register click event listener on roll-critical-btn', () => {
      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.roll-critical-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should call CriticalEffectsHelper.applyCriticalEffect with correct params', async () => {
      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CriticalEffectsHelper.applyCriticalEffect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-123' }),
        'Body',
        'Energy',
        undefined
      );
    });

    it('should pass pre-calculated critical damage from dataset when provided', async () => {
      mockButton.dataset.criticalDamage = '5';
      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CriticalEffectsHelper.applyCriticalEffect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-123' }),
        'Body',
        'Energy',
        5
      );
    });

    it('should pass undefined critical damage when not in dataset', async () => {
      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CriticalEffectsHelper.applyCriticalEffect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-123' }),
        'Body',
        'Energy',
        undefined
      );
    });
  });

  /* -------------------------------------------- */
  /*  _registerRollCriticalButton Visibility      */
  /* -------------------------------------------- */

  describe('Roll Critical Button Visibility', () => {
    let mockHtml;
    let mockButton;

    beforeEach(() => {
      jest.clearAllMocks();

      mockButton = {
        dataset: {
          actorId: 'actor-123',
          location: 'Body',
          damageType: 'Impact'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn((selector) => {
          if (selector === '.roll-critical-btn') {
            return [mockButton];
          }
          return [];
        })
      };
    });

    it('should set canApply data attribute to true when user is GM', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: false
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: true
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(true);
    });

    it('should set canApply data attribute to true when user is actor owner', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: true
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(true);
    });

    it('should set canApply data attribute to false when user lacks permissions', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: false
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(false);
    });

    it('should set canApply to false when target actor not found', () => {
      global.game.actors.get.mockReturnValue(null);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => true) // restrictApplyDamageButton = true
      };

      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(false);
    });

    it('should set canApply to true for non-owner when restrictApplyDamageButton is false', () => {
      const mockActor = {
        id: 'actor-123',
        name: 'Test Actor',
        type: 'character',
        isOwner: false
      };

      global.game.actors.get.mockReturnValue(mockActor);
      global.game.scenes = { get: jest.fn(() => null) };
      global.game.user = {
        isGM: false
      };
      global.game.settings = {
        get: jest.fn(() => false) // restrictApplyDamageButton = false
      };

      ChatButtonHandlers._registerRollCriticalButton(mockHtml);

      expect(mockButton.dataset.canApply).toBe(true);
    });
  });

  /* -------------------------------------------- */
  /*  _registerCohesionRallyButton                */
  /* -------------------------------------------- */

  describe('_registerCohesionRallyButton', () => {
    let mockButton, mockHtml, mockRoll;

    beforeEach(() => {
      mockButton = {
        dataset: {
          leaderId: 'leader-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      mockRoll = {
        total: 50,
        toMessage: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn(async function() {
          return this;
        })
      };

      global.Roll = jest.fn(() => mockRoll);

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'leader-123',
          name: 'Squad Leader',
          system: {
            skills: {
              command: { total: 60 }
            },
            characteristics: {
              fs: { value: 40 }
            }
          }
        }))
      };

      global.game.settings.get.mockReturnValue({ value: 7, max: 10 });
      global.ChatMessage.getSpeaker.mockReturnValue({ alias: 'Squad Leader' });

      jest.spyOn(CohesionHelper, 'resolveRallyTest').mockReturnValue(true);
      jest.spyOn(CohesionHelper, 'applyCohesionDamage').mockResolvedValue(undefined);
    });

    it('should register click event listener on cohesion-rally-btn', () => {
      ChatButtonHandlers._registerCohesionRallyButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.cohesion-rally-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should calculate target number from max(command, FS)', async () => {
      ChatButtonHandlers._registerCohesionRallyButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      // max(command 60, FS 40) = 60
      expect(CohesionHelper.resolveRallyTest).toHaveBeenCalledWith(60, 50);
    });

    it('should post success message when rally succeeds', async () => {
      CohesionHelper.resolveRallyTest.mockReturnValue(true);

      ChatButtonHandlers._registerCohesionRallyButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('Rally Successful!')
        })
      );
      expect(CohesionHelper.applyCohesionDamage).not.toHaveBeenCalled();
    });

    it('should apply cohesion damage on rally failure', async () => {
      CohesionHelper.resolveRallyTest.mockReturnValue(false);

      ChatButtonHandlers._registerCohesionRallyButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CohesionHelper.applyCohesionDamage).toHaveBeenCalledWith(1);
      expect(mockRoll.toMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          flavor: expect.stringContaining('Rally Failed!')
        })
      );
    });
  });

  /* -------------------------------------------- */
  /*  _registerCohesionDamageAcceptButton         */
  /* -------------------------------------------- */

  describe('_registerCohesionDamageAcceptButton', () => {
    let mockButton, mockHtml;

    beforeEach(() => {
      mockButton = {
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      global.game.settings.get.mockReturnValue({ value: 6, max: 10 });
      global.ChatMessage.create.mockResolvedValue(undefined);

      jest.spyOn(CohesionHelper, 'applyCohesionDamage').mockResolvedValue(undefined);
    });

    it('should register click event listener on cohesion-damage-accept-btn', () => {
      ChatButtonHandlers._registerCohesionDamageAcceptButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.cohesion-damage-accept-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should apply cohesion damage and post chat message', async () => {
      ChatButtonHandlers._registerCohesionDamageAcceptButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(CohesionHelper.applyCohesionDamage).toHaveBeenCalledWith(1);
      expect(global.ChatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Cohesion Lost')
        })
      );
    });
  });

  /* -------------------------------------------- */
  /*  _registerExtinguishButton                   */
  /* -------------------------------------------- */

  describe('_registerExtinguishButton', () => {
    let mockButton, mockHtml;

    beforeEach(() => {
      mockButton = {
        dataset: {
          actorId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Test Actor',
          system: {
            characteristics: {
              ag: { value: 40 }
            }
          },
          setCondition: jest.fn().mockResolvedValue(undefined)
        }))
      };
    });

    it('should register click event listener on extinguish-btn', () => {
      ChatButtonHandlers._registerExtinguishButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.extinguish-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should open dialog with correct AG and base target', async () => {
      ChatButtonHandlers._registerExtinguishButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(global.foundry.applications.api.DialogV2.wait).toHaveBeenCalledWith(
        expect.objectContaining({
          window: expect.objectContaining({
            title: expect.stringContaining('Extinguish')
          }),
          content: expect.stringContaining('AG: 40')
        })
      );
    });
  });

  /* -------------------------------------------- */
  /*  _registerPsychicOpposeButton                */
  /* -------------------------------------------- */

  describe('_registerPsychicOpposeButton', () => {
    let mockButton, mockHtml;

    beforeEach(() => {
      mockButton = {
        dataset: {
          powerName: 'Compel',
          psykerDos: '3',
          targetName: 'Target Actor',
          targetWp: '40',
          targetId: 'actor-123'
        },
        addEventListener: jest.fn()
      };

      mockHtml = {
        querySelectorAll: jest.fn(() => [mockButton])
      };

      global.game.actors = {
        get: jest.fn(() => ({
          id: 'actor-123',
          name: 'Target Actor',
          system: {
            characteristics: {
              wil: { value: 40 }
            }
          }
        }))
      };
    });

    it('should register click event listener on psychic-oppose-btn', () => {
      ChatButtonHandlers._registerPsychicOpposeButton(mockHtml);

      expect(mockHtml.querySelectorAll).toHaveBeenCalledWith('.psychic-oppose-btn');
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should open dialog with target WP and modifiers', async () => {
      ChatButtonHandlers._registerPsychicOpposeButton(mockHtml);

      const clickHandler = mockButton.addEventListener.mock.calls[0][1];
      await clickHandler({ currentTarget: mockButton });

      expect(global.foundry.applications.api.DialogV2.wait).toHaveBeenCalledWith(
        expect.objectContaining({
          window: expect.objectContaining({
            title: expect.stringContaining('Opposed Test: Compel')
          }),
          content: expect.stringContaining('Opposed Willpower Test: Target Actor')
        })
      );
    });
  });
});
