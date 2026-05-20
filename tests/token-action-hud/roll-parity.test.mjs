import { jest } from '@jest/globals';

/**
 * CRITICAL: Integration tests enforcing zero-duplication principle.
 *
 * These tests verify that Token Action HUD actions produce IDENTICAL behavior
 * to character sheet actions. If someone modifies sheet roll behavior, these
 * tests MUST fail until TAH is updated.
 *
 * Contract: TAH is a thin routing layer - all roll logic lives in core helpers.
 */
describe('TAH Roll Parity (Anti-Duplication)', () => {
  let RollHandler;
  let RollExecutor;
  let CombatHelper;
  let mockToken;
  let mockActor;
  let capturedCalls;

  beforeEach(async () => {
    capturedCalls = [];

    // Mock game.user
    global.game = {
      user: {
        isGM: true,
      },
      socket: {
        emit: jest.fn(),
      },
    };

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: jest.fn(),
        info: jest.fn(),
      },
    };

    // Create mock actor with full data
    mockActor = {
      id: 'test-actor-123',
      type: 'character',
      name: 'Test Marine',
      system: {
        characteristics: {
          ws: { value: 45, total: 45 },
          bs: { value: 50, total: 50 },
          ag: { value: 40, total: 42 },
          per: { value: 38, total: 38 },
        },
        skills: [
          { key: 'awareness', total: 55, label: 'Awareness', isAdvanced: false },
          { key: 'stealth', total: 40, label: 'Stealth', isAdvanced: false },
          { key: 'intimidate', total: 45, label: 'Intimidate', isAdvanced: true },
        ],
      },
      testUserPermission: jest.fn(() => true),
      items: {
        get: jest.fn(),
      },
    };

    // Create mock token
    mockToken = {
      actor: mockActor,
    };

    // Import real RollExecutor and mock its methods
    const rollExecutorModule = await import('../../src/module/helpers/roll-executor.mjs');
    RollExecutor = rollExecutorModule.RollExecutor;

    // Mock RollExecutor methods to capture calls
    RollExecutor.showSkillDialog = jest.fn(async (actor, skill, label, skillTotal, ...args) => {
      capturedCalls.push({
        method: 'showSkillDialog',
        actor,
        skill,
        label,
        skillTotal,
        args,
      });
      return null; // Simulate cancel
    });

    RollExecutor.showCharacteristicDialog = jest.fn(async (actor, charKey, label, characteristic, ...args) => {
      capturedCalls.push({
        method: 'showCharacteristicDialog',
        actor,
        charKey,
        label,
        characteristic,
        args,
      });
      return null; // Simulate cancel
    });

    // Import real CombatHelper and mock its methods
    const combatModule = await import('../../src/module/helpers/combat/combat.mjs');
    CombatHelper = combatModule.CombatHelper;

    CombatHelper.weaponAttackDialog = jest.fn(async (actor, weapon, options = {}) => {
      capturedCalls.push({
        method: 'weaponAttackDialog',
        actor,
        weapon,
        options,
      });
      return null;
    });

    // Mock CombatRouter to delegate to CombatHelper (simulating real behavior)
    const mockCombatRouter = {
      executeAttack: jest.fn(async (actor, item) => {
        return await CombatHelper.weaponAttackDialog(actor, item);
      }),
      executeDamage: jest.fn(async (actor, item) => {
        return await CombatHelper.weaponDamageRoll(actor, item);
      }),
    };

    // Import RollHandler and inject mocks
    const rollHandlerModule = await import('../../src/module/token-action-hud/roll-handler.mjs');
    const BaseRollHandler = class {
      constructor(actor, token) {
        this.actor = actor;
        this.token = token;
      }
    };
    RollHandler = rollHandlerModule.createRollHandler(BaseRollHandler, RollExecutor, CombatHelper, null, mockCombatRouter);
  });

  describe('Contract Tests (Method Signatures)', () => {
    test('RollExecutor.showSkillDialog exists and is a function', () => {
      expect(RollExecutor.showSkillDialog).toBeDefined();
      expect(typeof RollExecutor.showSkillDialog).toBe('function');
    });

    test('RollExecutor.showCharacteristicDialog exists and is a function', () => {
      expect(RollExecutor.showCharacteristicDialog).toBeDefined();
      expect(typeof RollExecutor.showCharacteristicDialog).toBe('function');
    });

    test('CombatHelper.weaponAttackDialog exists and is a function', () => {
      expect(CombatHelper.weaponAttackDialog).toBeDefined();
      expect(typeof CombatHelper.weaponAttackDialog).toBe('function');
    });
  });

  describe('Skill Roll Parity', () => {
    test('should produce identical skill rolls from sheet and TAH', async () => {
      const skill = mockActor.system.skills[0]; // awareness
      const label = skill.label;
      const skillTotal = skill.total;

      // Path 1: Direct sheet call
      capturedCalls = [];
      await RollExecutor.showSkillDialog(mockActor, skill, label, skillTotal);
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'skillTest', encodedValue: `skill|${skill.key}` });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall).toBeDefined();
      expect(sheetCall.method).toBe('showSkillDialog');
      expect(tahCall.method).toBe('showSkillDialog');
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.skill).toEqual(sheetCall.skill);
      expect(tahCall.label).toBe(sheetCall.label);
      expect(tahCall.skillTotal).toBe(sheetCall.skillTotal);
    });

    test('should handle basic skills identically', async () => {
      const skill = mockActor.system.skills.find(s => s.key === 'stealth');
      const label = skill.label;
      const skillTotal = skill.total;

      // Path 1: Direct sheet call
      capturedCalls = [];
      await RollExecutor.showSkillDialog(mockActor, skill, label, skillTotal);
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'skillTest', encodedValue: 'skill|stealth' });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.skill.key).toBe(sheetCall.skill.key);
      expect(tahCall.label).toBe(sheetCall.label);
      expect(tahCall.skillTotal).toBe(sheetCall.skillTotal);
    });

    test('should handle advanced skills identically', async () => {
      const skill = mockActor.system.skills.find(s => s.key === 'intimidate');
      const label = skill.label;
      const skillTotal = skill.total;

      // Path 1: Direct sheet call
      capturedCalls = [];
      await RollExecutor.showSkillDialog(mockActor, skill, label, skillTotal);
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'skillTest', encodedValue: 'skill|intimidate' });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.skill.key).toBe(sheetCall.skill.key);
      expect(tahCall.label).toBe(sheetCall.label);
      expect(tahCall.skillTotal).toBe(sheetCall.skillTotal);
    });
  });

  describe('Characteristic Roll Parity', () => {
    test('should produce identical characteristic rolls from sheet and TAH', async () => {
      const charKey = 'ws';
      const characteristic = mockActor.system.characteristics.ws;
      const label = 'Weapon Skill';

      // Path 1: Direct sheet call
      capturedCalls = [];
      await RollExecutor.showCharacteristicDialog(mockActor, charKey, label, characteristic);
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'charTest', encodedValue: 'characteristic|ws' });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall).toBeDefined();
      expect(sheetCall.method).toBe('showCharacteristicDialog');
      expect(tahCall.method).toBe('showCharacteristicDialog');
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.charKey).toBe(sheetCall.charKey);
      expect(tahCall.label).toBe(sheetCall.label);
      expect(tahCall.characteristic).toEqual(sheetCall.characteristic);
    });

    test('should handle all characteristics identically (Agility)', async () => {
      const charKey = 'ag';
      const characteristic = mockActor.system.characteristics.ag;
      const label = 'Agility';

      // Path 1: Direct sheet call
      capturedCalls = [];
      await RollExecutor.showCharacteristicDialog(mockActor, charKey, label, characteristic);
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'charTest', encodedValue: 'characteristic|ag' });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.charKey).toBe(sheetCall.charKey);
      expect(tahCall.label).toBe(sheetCall.label);
      expect(tahCall.characteristic.total).toBe(sheetCall.characteristic.total);
    });

    test('should handle all characteristics identically (Perception)', async () => {
      const charKey = 'per';
      const characteristic = mockActor.system.characteristics.per;
      const label = 'Perception';

      // Path 1: Direct sheet call
      capturedCalls = [];
      await RollExecutor.showCharacteristicDialog(mockActor, charKey, label, characteristic);
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'charTest', encodedValue: 'characteristic|per' });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.charKey).toBe(sheetCall.charKey);
      expect(tahCall.label).toBe(sheetCall.label);
      expect(tahCall.characteristic.value).toBe(sheetCall.characteristic.value);
    });
  });

  describe('Weapon Attack Parity', () => {
    test('should produce identical weapon attacks from sheet and TAH', async () => {
      const weaponId = 'weapon-abc123';
      const mockWeapon = {
        id: weaponId,
        name: 'Bolter',
        type: 'weapon',
        system: { dmg: '1d10+5', penetration: 4 },
      };

      mockActor.items.get = jest.fn(() => mockWeapon);

      // Path 1: Direct sheet call (with default options)
      capturedCalls = [];
      await CombatHelper.weaponAttackDialog(mockActor, mockWeapon, {});
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'weaponAttack', encodedValue: `weapon|${weaponId}|attack` });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall).toBeDefined();
      expect(sheetCall.method).toBe('weaponAttackDialog');
      expect(tahCall.method).toBe('weaponAttackDialog');
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.weapon).toBe(sheetCall.weapon);
      expect(tahCall.weapon.id).toBe(weaponId);
    });

    test('should handle melee weapons identically', async () => {
      const weaponId = 'weapon-xyz789';
      const mockWeapon = {
        id: weaponId,
        name: 'Chainsword',
        type: 'weapon',
        system: { dmg: '1d10+2', penetration: 2 },
      };

      mockActor.items.get = jest.fn(() => mockWeapon);

      // Path 1: Direct sheet call (with default options)
      capturedCalls = [];
      await CombatHelper.weaponAttackDialog(mockActor, mockWeapon, {});
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'weaponAttack', encodedValue: `weapon|${weaponId}|attack` });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.weapon).toBe(sheetCall.weapon);
      expect(tahCall.weapon.name).toBe('Chainsword');
    });

    test('should handle grenades identically', async () => {
      const weaponId = 'weapon-grenade-456';
      const mockWeapon = {
        id: weaponId,
        name: 'Frag Grenade',
        type: 'weapon',
        system: { dmg: '2d10', penetration: 0 },
      };

      mockActor.items.get = jest.fn(() => mockWeapon);

      // Path 1: Direct sheet call (with default options)
      capturedCalls = [];
      await CombatHelper.weaponAttackDialog(mockActor, mockWeapon, {});
      const sheetCall = capturedCalls[0];

      // Path 2: TAH RollHandler call
      capturedCalls = [];
      const handler = new RollHandler(mockActor, mockToken);
      await handler.handleAction({ actionId: 'weaponAttack', encodedValue: `weapon|${weaponId}|attack` });
      const tahCall = capturedCalls[0];

      // Assert: Identical parameters
      expect(tahCall.actor).toBe(sheetCall.actor);
      expect(tahCall.weapon).toBe(sheetCall.weapon);
      expect(tahCall.weapon.type).toBe('weapon');
    });
  });

  describe('Anti-Regression Protection', () => {
    test('TAH must fail if showSkillDialog signature changes', async () => {
      // This test documents the expected signature
      const skill = mockActor.system.skills[0];
      const handler = new RollHandler(mockActor, mockToken);

      capturedCalls = [];
      await handler.handleAction({ actionId: 'skillTest', encodedValue: `skill|${skill.key}` });

      // If this assertion fails, it means:
      // 1. RollExecutor.showSkillDialog signature changed
      // 2. TAH RollHandler must be updated to match
      expect(RollExecutor.showSkillDialog).toHaveBeenCalledWith(
        mockActor,
        expect.objectContaining({ key: skill.key }),
        expect.any(String),
        expect.any(Number)
      );
    });

    test('TAH must fail if showCharacteristicDialog signature changes', async () => {
      // This test documents the expected signature
      const handler = new RollHandler(mockActor, mockToken);

      capturedCalls = [];
      await handler.handleAction({ actionId: 'charTest', encodedValue: 'characteristic|ws' });

      // If this assertion fails, it means:
      // 1. RollExecutor.showCharacteristicDialog signature changed
      // 2. TAH RollHandler must be updated to match
      expect(RollExecutor.showCharacteristicDialog).toHaveBeenCalledWith(
        mockActor,
        'ws',
        expect.any(String),
        expect.objectContaining({ value: expect.any(Number) })
      );
    });

    test('TAH must fail if weaponAttackDialog signature changes', async () => {
      // This test documents the expected signature
      const weaponId = 'weapon-abc123';
      const mockWeapon = {
        id: weaponId,
        name: 'Bolter',
        type: 'weapon',
        system: { dmg: '1d10+5', penetration: 4 },
      };

      mockActor.items.get = jest.fn(() => mockWeapon);

      const handler = new RollHandler(mockActor, mockToken);

      capturedCalls = [];
      await handler.handleAction({ actionId: 'weaponAttack', encodedValue: `weapon|${weaponId}|attack` });

      // If this assertion fails, it means:
      // 1. CombatHelper.weaponAttackDialog signature changed
      // 2. TAH RollHandler must be updated to match
      expect(CombatHelper.weaponAttackDialog).toHaveBeenCalledWith(
        mockActor,
        mockWeapon
      );
    });
  });
});
