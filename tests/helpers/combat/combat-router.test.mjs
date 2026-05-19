import { jest } from '@jest/globals';
import { CombatRouter } from '../../../src/module/helpers/combat/combat-router.mjs';

describe('CombatRouter', () => {
  let mockActor;
  let mockWeapon;
  let mockPsychicPower;
  let mockCombatHelper;
  let mockPsychicCombatHelper;
  let mockFlameAttack;
  let mockWeaponQualityHelper;

  beforeEach(() => {
    // Mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Marine',
      type: 'character'
    };

    // Mock weapon
    mockWeapon = {
      id: 'weapon-123',
      name: 'Test Weapon',
      type: 'weapon',
      system: {
        dmg: '1d10+5'
      }
    };

    // Mock psychic power
    mockPsychicPower = {
      id: 'power-123',
      name: 'Test Power',
      type: 'psychic-power',
      system: {
        damageFormula: '1d10+10'
      }
    };

    // Mock helpers
    mockCombatHelper = {
      weaponAttackDialog: jest.fn(),
      weaponDamageRoll: jest.fn()
    };

    mockPsychicCombatHelper = {
      focusPowerDialog: jest.fn()
    };

    mockFlameAttack = jest.fn();
    mockWeaponQualityHelper = {
      hasQuality: jest.fn().mockResolvedValue(false)
    };

    // Inject mocks
    CombatRouter._setMocks({
      CombatHelper: mockCombatHelper,
      PsychicCombatHelper: mockPsychicCombatHelper,
      flameAttack: mockFlameAttack,
      WeaponQualityHelper: mockWeaponQualityHelper
    });
  });

  describe('executeAttack', () => {
    it('should route weapon attack to CombatHelper.weaponAttackDialog', async () => {
      await CombatRouter.executeAttack(mockActor, mockWeapon);

      expect(mockCombatHelper.weaponAttackDialog).toHaveBeenCalledWith(mockActor, mockWeapon);
    });

    it('should route psychic power attack to PsychicCombatHelper.focusPowerDialog', async () => {
      await CombatRouter.executeAttack(mockActor, mockPsychicPower);

      expect(mockPsychicCombatHelper.focusPowerDialog).toHaveBeenCalledWith(mockActor, mockPsychicPower);
    });

    it('should throw error for unsupported item type', async () => {
      const mockTalent = {
        id: 'talent-123',
        name: 'Test Talent',
        type: 'talent',
        system: {}
      };

      await expect(CombatRouter.executeAttack(mockActor, mockTalent))
        .rejects.toThrow('Item type "talent" does not support attacks');
    });
  });

  describe('executeDamage', () => {
    it('should route to flameAttack when weapon has flame quality', async () => {
      mockWeaponQualityHelper.hasQuality.mockResolvedValueOnce(true);

      await CombatRouter.executeDamage(mockActor, mockWeapon);

      expect(mockFlameAttack).toHaveBeenCalledWith(mockWeapon);
      expect(mockCombatHelper.weaponDamageRoll).not.toHaveBeenCalled();
    });

    it('should route standard weapon damage to CombatHelper.weaponDamageRoll', async () => {
      await CombatRouter.executeDamage(mockActor, mockWeapon);

      expect(mockCombatHelper.weaponDamageRoll).toHaveBeenCalledWith(mockActor, mockWeapon);
    });

    it('should route psychic power damage to PsychicCombatHelper.focusPowerDialog', async () => {
      await CombatRouter.executeDamage(mockActor, mockPsychicPower);

      expect(mockPsychicCombatHelper.focusPowerDialog).toHaveBeenCalledWith(mockActor, mockPsychicPower);
    });

    it('should throw error for unsupported item type', async () => {
      const mockTalent = {
        id: 'talent-123',
        name: 'Test Talent',
        type: 'talent',
        system: {}
      };

      await expect(CombatRouter.executeDamage(mockActor, mockTalent))
        .rejects.toThrow('Item type "talent" does not support damage rolls');
    });
  });
});
