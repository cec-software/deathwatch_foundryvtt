import { jest } from '@jest/globals';
import { CombatRouter } from '../../src/module/helpers/combat/combat-router.mjs';

describe('CombatRouter - Flamer Attack Workflow', () => {
  let mockActor;
  let mockFlameWeapon;
  let mockStandardWeapon;
  let mockCombatHelper;
  let mockWeaponQualityHelper;

  beforeEach(() => {
    // Mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Marine',
      type: 'character',
      system: {
        characteristics: {
          str: { mod: 4 }
        }
      }
    };

    // Mock flame weapon
    mockFlameWeapon = {
      id: 'weapon-flame',
      name: 'Heavy Flamer',
      type: 'weapon',
      system: {
        dmg: '1d10+4',
        attachedQualities: ['flame']
      }
    };

    // Mock standard weapon
    mockStandardWeapon = {
      id: 'weapon-standard',
      name: 'Bolter',
      type: 'weapon',
      system: {
        dmg: '1d10+5',
        attachedQualities: []
      }
    };

    // Mock helpers
    mockCombatHelper = {
      weaponAttackDialog: jest.fn(),
      weaponDamageRoll: jest.fn()
    };

    mockWeaponQualityHelper = {
      hasQuality: jest.fn((weapon, qualityKey) => {
        // Return true only if weapon has flame quality
        return Promise.resolve(
          weapon.system.attachedQualities?.includes(qualityKey) || false
        );
      })
    };

    // Inject mocks
    CombatRouter._setMocks({
      CombatHelper: mockCombatHelper,
      WeaponQualityHelper: mockWeaponQualityHelper
    });
  });

  describe('executeAttack - Flame Weapon Detection', () => {
    it('should route flame weapon attack to weaponDamageRoll with isFlamerAttack flag', async () => {
      await CombatRouter.executeAttack(mockActor, mockFlameWeapon);

      // Flame weapon should be routed to weaponDamageRoll with isFlamerAttack: true
      expect(mockCombatHelper.weaponDamageRoll).toHaveBeenCalledWith(
        mockActor,
        mockFlameWeapon,
        { isFlamerAttack: true }
      );

      // Should NOT call standard weaponAttackDialog
      expect(mockCombatHelper.weaponAttackDialog).not.toHaveBeenCalled();
    });

    it('should route standard weapon attack to weaponAttackDialog', async () => {
      await CombatRouter.executeAttack(mockActor, mockStandardWeapon);

      // Standard weapon should use normal attack flow
      expect(mockCombatHelper.weaponAttackDialog).toHaveBeenCalledWith(
        mockActor,
        mockStandardWeapon
      );

      // Should NOT call weaponDamageRoll
      expect(mockCombatHelper.weaponDamageRoll).not.toHaveBeenCalled();
    });
  });

  describe('executeDamage - Flame Weapon Blocking', () => {
    beforeEach(() => {
      // Mock ui.notifications (Foundry global)
      global.ui = {
        notifications: {
          info: jest.fn()
        }
      };
    });

    afterEach(() => {
      delete global.ui;
    });

    it('should block flame weapon damage and show notification', async () => {
      await CombatRouter.executeDamage(mockActor, mockFlameWeapon);

      // Should show flame weapon notification
      expect(global.ui.notifications.info).toHaveBeenCalledWith(
        'Use Attack button to roll damage, then run Flame Attack macro for each target.'
      );

      // Should NOT route to weaponDamageRoll
      expect(mockCombatHelper.weaponDamageRoll).not.toHaveBeenCalled();
    });

    it('should route standard weapon damage to weaponDamageRoll', async () => {
      await CombatRouter.executeDamage(mockActor, mockStandardWeapon);

      // Standard weapon should route to damage roll
      expect(mockCombatHelper.weaponDamageRoll).toHaveBeenCalledWith(
        mockActor,
        mockStandardWeapon
      );

      // Should NOT show flame notification
      expect(global.ui.notifications.info).not.toHaveBeenCalled();
    });
  });

  describe('weaponDamageRoll - Flamer Damage Roll Chat Output', () => {
    let mockChatMessage;
    let mockRoll;

    beforeEach(() => {
      // Mock ChatMessage
      mockChatMessage = {
        id: 'msg-123'
      };
      global.ChatMessage = {
        create: jest.fn().mockResolvedValue(mockChatMessage)
      };

      // Mock Roll
      mockRoll = {
        total: 14,
        formula: '1d10+4',
        terms: []
      };
      global.Roll = jest.fn().mockImplementation(() => ({
        evaluate: jest.fn().mockResolvedValue(mockRoll)
      }));

      // Mock game.user
      global.game = {
        user: {
          id: 'user-123',
          targets: {
            first: jest.fn().mockReturnValue(null)
          }
        }
      };

      // Mock foundry.utils for Sanitizer
      global.foundry = {
        utils: {
          escapeHTML: jest.fn((str) => str)
        }
      };

      // Restore real CombatHelper for this test
      CombatRouter._setMocks({
        CombatHelper: null, // Use real CombatHelper
        WeaponQualityHelper: mockWeaponQualityHelper
      });
    });

    afterEach(() => {
      delete global.ChatMessage;
      delete global.Roll;
      delete global.game;
      delete global.foundry;
    });

    it('should create chat message with flamer attack data when isFlamerAttack is true', async () => {
      const CombatHelper = (await import('../../src/module/helpers/combat/combat.mjs')).CombatHelper;

      // Mock game.settings for rollMode
      global.game.settings = {
        get: jest.fn().mockReturnValue('roll')
      };

      // Mock ChatMessage.getSpeaker
      global.ChatMessage.getSpeaker = jest.fn().mockReturnValue({
        actor: mockActor.id,
        alias: mockActor.name
      });

      await CombatHelper.weaponDamageRoll(mockActor, mockFlameWeapon, { isFlamerAttack: true });

      // Verify chat message was created
      expect(global.ChatMessage.create).toHaveBeenCalledTimes(1);

      const chatArgs = global.ChatMessage.create.mock.calls[0][0];

      // Verify content includes weapon name and emoji
      expect(chatArgs.content).toContain('🔥 Flamer: Heavy Flamer');

      // Verify all 7 required data-* attributes for Flame Attack macro
      expect(chatArgs.content).toContain('data-flamer-damage="14"');
      expect(chatArgs.content).toContain('data-flamer-pen="0"');
      expect(chatArgs.content).toContain('data-flamer-type="Energy"');
      expect(chatArgs.content).toContain('data-flamer-range="20"');
      expect(chatArgs.content).toContain(`data-actor-id="${mockActor.id}"`);
      expect(chatArgs.content).toContain('data-weapon-name="Heavy Flamer"');
      expect(chatArgs.content).toMatch(/data-timestamp="\d+"/);

      // Verify visible content fields
      expect(chatArgs.content).toContain('<strong>Damage:</strong> 14');
      expect(chatArgs.content).toContain('<strong>Penetration:</strong> 0');
      expect(chatArgs.content).toContain('<strong>Damage Type:</strong> Energy');
      expect(chatArgs.content).toContain('<strong>Range:</strong> 20m');
      expect(chatArgs.content).toContain('Run Flame Attack macro for each target in cone.');

      // Cleanup
      delete global.game.settings;
      delete global.ChatMessage.getSpeaker;
    });

    it('should include penetration value in data attributes', async () => {
      const CombatHelper = (await import('../../src/module/helpers/combat/combat.mjs')).CombatHelper;

      // Mock game.settings for rollMode
      global.game.settings = {
        get: jest.fn().mockReturnValue('roll')
      };

      // Mock ChatMessage.getSpeaker
      global.ChatMessage.getSpeaker = jest.fn().mockReturnValue({
        actor: mockActor.id,
        alias: mockActor.name
      });

      // Weapon with penetration
      const flamerWithPen = {
        ...mockFlameWeapon,
        system: {
          ...mockFlameWeapon.system,
          penetration: 6,
          range: 30
        }
      };

      await CombatHelper.weaponDamageRoll(mockActor, flamerWithPen, { isFlamerAttack: true });

      const chatArgs = global.ChatMessage.create.mock.calls[0][0];
      expect(chatArgs.content).toContain('data-flamer-pen="6"');
      expect(chatArgs.content).toContain('data-flamer-range="30"');

      // Cleanup
      delete global.game.settings;
      delete global.ChatMessage.getSpeaker;
    });

    it('should use standard dialog flow when isFlamerAttack is false or undefined', async () => {
      const CombatHelper = (await import('../../src/module/helpers/combat/combat.mjs')).CombatHelper;

      // Mock DialogV2 (used by standard flow)
      global.foundry.applications = {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValue(null)
          }
        }
      };

      await CombatHelper.weaponDamageRoll(mockActor, mockStandardWeapon);

      // Should use dialog flow, not chat message
      expect(global.foundry.applications.api.DialogV2.wait).toHaveBeenCalledTimes(1);
      expect(global.ChatMessage.create).not.toHaveBeenCalled();
    });

    it('should deduct ammunition when flamer has loaded ammo', async () => {
      const CombatHelper = (await import('../../src/module/helpers/combat/combat.mjs')).CombatHelper;

      // Create ammo item
      const mockAmmo = {
        id: 'ammo-123',
        name: 'Flamer Fuel',
        system: {
          capacity: { value: 5, max: 10 }
        },
        update: jest.fn().mockResolvedValue({})
      };

      // Flamer with loaded ammo
      const flamerWithAmmo = {
        ...mockFlameWeapon,
        system: {
          ...mockFlameWeapon.system,
          clip: '10',
          loadedAmmo: 'ammo-123'
        }
      };

      // Actor with ammo item
      const actorWithAmmo = {
        ...mockActor,
        items: {
          get: jest.fn((id) => (id === 'ammo-123' ? mockAmmo : null))
        },
        sheet: {
          render: jest.fn()
        }
      };

      // Mock game.settings for rollMode
      global.game.settings = {
        get: jest.fn().mockReturnValue('roll')
      };

      // Mock ChatMessage.getSpeaker
      global.ChatMessage.getSpeaker = jest.fn().mockReturnValue({
        actor: actorWithAmmo.id,
        alias: actorWithAmmo.name
      });

      await CombatHelper.weaponDamageRoll(actorWithAmmo, flamerWithAmmo, { isFlamerAttack: true });

      // Verify ammo was deducted by 1
      expect(mockAmmo.update).toHaveBeenCalledWith({ 'system.capacity.value': 4 });

      // Verify sheet was refreshed
      expect(actorWithAmmo.sheet.render).toHaveBeenCalledWith(false);

      // Cleanup
      delete global.game.settings;
      delete global.ChatMessage.getSpeaker;
    });

    it('should not deduct ammunition when flamer has no ammo management', async () => {
      const CombatHelper = (await import('../../src/module/helpers/combat/combat.mjs')).CombatHelper;

      // Flamer without clip/ammo
      const flamerNoAmmo = {
        ...mockFlameWeapon,
        system: {
          ...mockFlameWeapon.system,
          clip: '—',
          loadedAmmo: null
        }
      };

      const actorNoAmmo = {
        ...mockActor,
        items: {
          get: jest.fn()
        },
        sheet: {
          render: jest.fn()
        }
      };

      // Mock game.settings for rollMode
      global.game.settings = {
        get: jest.fn().mockReturnValue('roll')
      };

      // Mock ChatMessage.getSpeaker
      global.ChatMessage.getSpeaker = jest.fn().mockReturnValue({
        actor: actorNoAmmo.id,
        alias: actorNoAmmo.name
      });

      await CombatHelper.weaponDamageRoll(actorNoAmmo, flamerNoAmmo, { isFlamerAttack: true });

      // Verify no ammo lookup attempted
      expect(actorNoAmmo.items.get).not.toHaveBeenCalled();

      // Cleanup
      delete global.game.settings;
      delete global.ChatMessage.getSpeaker;
    });

    it('should not deduct ammunition for horde actors', async () => {
      const CombatHelper = (await import('../../src/module/helpers/combat/combat.mjs')).CombatHelper;

      // Create ammo item
      const mockAmmo = {
        id: 'ammo-123',
        system: {
          capacity: { value: 5 }
        },
        update: jest.fn()
      };

      // Flamer with loaded ammo
      const flamerWithAmmo = {
        ...mockFlameWeapon,
        system: {
          ...mockFlameWeapon.system,
          clip: '10',
          loadedAmmo: 'ammo-123'
        }
      };

      // Horde actor with ammo
      const hordeActor = {
        ...mockActor,
        type: 'horde',
        items: {
          get: jest.fn((id) => (id === 'ammo-123' ? mockAmmo : null))
        },
        sheet: {
          render: jest.fn()
        }
      };

      // Mock game.settings for rollMode
      global.game.settings = {
        get: jest.fn().mockReturnValue('roll')
      };

      // Mock ChatMessage.getSpeaker
      global.ChatMessage.getSpeaker = jest.fn().mockReturnValue({
        actor: hordeActor.id,
        alias: hordeActor.name
      });

      await CombatHelper.weaponDamageRoll(hordeActor, flamerWithAmmo, { isFlamerAttack: true });

      // Verify ammo was NOT deducted for horde
      expect(mockAmmo.update).not.toHaveBeenCalled();

      // Cleanup
      delete global.game.settings;
      delete global.ChatMessage.getSpeaker;
    });
  });
});
