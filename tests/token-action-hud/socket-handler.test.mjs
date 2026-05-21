import { jest } from '@jest/globals';
import { handleTAHSocketAction } from '../../src/module/init/socket.mjs';
import { CombatRouter } from '../../src/module/helpers/combat/combat-router.mjs';
import { CombatHelper } from '../../src/module/helpers/combat/combat.mjs';
import { RollExecutor } from '../../src/module/helpers/roll-executor.mjs';

describe('TAH Socket Handler', () => {
  let executeAttackSpy;
  let clearJamSpy;
  let showSkillDialogSpy;
  let showCharacteristicDialogSpy;

  beforeEach(() => {
    // Mock game
    global.game = {
      user: { isGM: true },
      actors: {
        get: jest.fn()
      }
    };

    // Spy on helper methods
    executeAttackSpy = jest.spyOn(CombatRouter, 'executeAttack').mockResolvedValue();
    clearJamSpy = jest.spyOn(CombatHelper, 'clearJam').mockResolvedValue();
    showSkillDialogSpy = jest.spyOn(RollExecutor, 'showSkillDialog').mockResolvedValue();
    showCharacteristicDialogSpy = jest.spyOn(RollExecutor, 'showCharacteristicDialog').mockResolvedValue();
  });

  afterEach(() => {
    delete global.game;
    jest.restoreAllMocks();
  });

  describe('handleTAHSocketAction', () => {
    it('should return early if user is not GM', async () => {
      global.game.user.isGM = false;
      const data = { actorId: 'actor123', encodedValue: 'weapon|weapon123' };

      await handleTAHSocketAction(data);

      expect(global.game.actors.get).not.toHaveBeenCalled();
    });

    it('should handle weapon attack action', async () => {
      const mockWeapon = { id: 'weapon123', name: 'Bolter', type: 'weapon' };
      const mockActor = {
        id: 'actor123',
        name: 'Test Actor',
        items: {
          get: jest.fn(() => mockWeapon)
        }
      };
      global.game.actors.get.mockReturnValue(mockActor);

      const data = { actorId: 'actor123', encodedValue: 'weapon|weapon123|attack' };
      await handleTAHSocketAction(data);

      expect(global.game.actors.get).toHaveBeenCalledWith('actor123');
      expect(mockActor.items.get).toHaveBeenCalledWith('weapon123');
      expect(executeAttackSpy).toHaveBeenCalledWith(mockActor, mockWeapon);
    });

    it('should handle skill test action', async () => {
      const mockSkill = { key: 'awareness', label: 'Awareness', total: 55 };
      const mockActor = {
        id: 'actor123',
        name: 'Test Actor',
        system: {
          skills: [mockSkill]
        }
      };
      global.game.actors.get.mockReturnValue(mockActor);

      const data = { actorId: 'actor123', encodedValue: 'skill|awareness' };
      await handleTAHSocketAction(data);

      expect(global.game.actors.get).toHaveBeenCalledWith('actor123');
      expect(showSkillDialogSpy).toHaveBeenCalledWith(
        mockActor,
        mockSkill,
        'Awareness',
        55
      );
    });

    it('should handle characteristic test action', async () => {
      const mockActor = {
        id: 'actor123',
        name: 'Test Actor',
        system: {
          characteristics: {
            weaponSkill: { total: 45 }
          }
        }
      };
      global.game.actors.get.mockReturnValue(mockActor);

      const data = { actorId: 'actor123', encodedValue: 'characteristic|weaponSkill' };
      await handleTAHSocketAction(data);

      expect(global.game.actors.get).toHaveBeenCalledWith('actor123');
      expect(showCharacteristicDialogSpy).toHaveBeenCalledWith(
        mockActor,
        45,
        'Weapon Skill'
      );
    });

    it('should handle un-jam weapon action', async () => {
      const mockJammedWeapon = {
        id: 'weapon456',
        name: 'Jammed Bolter',
        type: 'weapon',
        system: { jammed: true }
      };
      const mockActor = {
        id: 'actor123',
        name: 'Test Actor',
        items: {
          get: jest.fn((id) => id === 'weapon456' ? mockJammedWeapon : null),
          filter: jest.fn(() => [mockJammedWeapon])
        }
      };
      global.game.actors.get.mockReturnValue(mockActor);

      const data = { actorId: 'actor123', encodedValue: 'combat-action|unjam|weapon456' };
      await handleTAHSocketAction(data);

      expect(global.game.actors.get).toHaveBeenCalledWith('actor123');
      expect(clearJamSpy).toHaveBeenCalledWith(mockActor, mockJammedWeapon);
    });

    it('should handle missing actor gracefully', async () => {
      global.game.actors.get.mockReturnValue(null);

      const data = { actorId: 'missing123', encodedValue: 'weapon|weapon123' };

      // Should not throw
      await expect(handleTAHSocketAction(data)).resolves.not.toThrow();
    });
  });
});
