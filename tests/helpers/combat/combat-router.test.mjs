import { jest } from '@jest/globals';
import { CombatRouter } from '../../../src/module/helpers/combat/combat-router.mjs';

describe('CombatRouter', () => {
  let mockActor;
  let mockWeapon;
  let mockPsychicPower;
  let mockCombatHelper;
  let mockPsychicCombatHelper;
  let mockFlameAttack;
  let mockTemplateAttack;
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
        dmg: '1d10+5',
        template: null
      }
    };

    // Mock psychic power
    mockPsychicPower = {
      id: 'power-123',
      name: 'Test Power',
      type: 'psychic-power',
      system: {
        damageFormula: '1d10+10',
        template: null
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
    mockTemplateAttack = jest.fn();

    mockWeaponQualityHelper = {
      hasQuality: jest.fn().mockResolvedValue(false)
    };

    // Inject mocks
    CombatRouter._setMocks({
      CombatHelper: mockCombatHelper,
      PsychicCombatHelper: mockPsychicCombatHelper,
      flameAttack: mockFlameAttack,
      templateAttack: mockTemplateAttack,
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
    it('should route to templateAttack when weapon has template configuration', async () => {
      mockWeapon.system.template = { type: 'cone', distance: '20', angle: '30' };

      await CombatRouter.executeDamage(mockActor, mockWeapon);

      expect(mockTemplateAttack).toHaveBeenCalledWith(mockWeapon, mockActor);
      expect(mockCombatHelper.weaponDamageRoll).not.toHaveBeenCalled();
      expect(mockFlameAttack).not.toHaveBeenCalled();
    });

    it('should route to templateAttack when psychic power has template configuration', async () => {
      mockPsychicPower.system.template = { type: 'cone', distance: '30', angle: '30' };

      await CombatRouter.executeDamage(mockActor, mockPsychicPower);

      expect(mockTemplateAttack).toHaveBeenCalledWith(mockPsychicPower, mockActor);
      expect(mockPsychicCombatHelper.focusPowerDialog).not.toHaveBeenCalled();
    });

    it('should route to flameAttack when weapon has flame quality (no template)', async () => {
      mockWeaponQualityHelper.hasQuality.mockResolvedValueOnce(true);

      await CombatRouter.executeDamage(mockActor, mockWeapon);

      expect(mockFlameAttack).toHaveBeenCalledWith(mockWeapon);
      expect(mockCombatHelper.weaponDamageRoll).not.toHaveBeenCalled();
    });

    it('should prefer template over flame quality when both present', async () => {
      mockWeapon.system.template = { type: 'cone', distance: '20', angle: '30' };
      mockWeaponQualityHelper.hasQuality.mockResolvedValueOnce(true);

      await CombatRouter.executeDamage(mockActor, mockWeapon);

      expect(mockTemplateAttack).toHaveBeenCalledWith(mockWeapon, mockActor);
      expect(mockFlameAttack).not.toHaveBeenCalled();
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

    it('should not check flame quality if template is present (optimization)', async () => {
      mockWeapon.system.template = { type: 'cone', distance: '20', angle: '30' };

      await CombatRouter.executeDamage(mockActor, mockWeapon);

      expect(mockWeaponQualityHelper.hasQuality).not.toHaveBeenCalled();
    });
  });
});
