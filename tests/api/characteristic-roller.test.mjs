import { jest } from '@jest/globals';
import { CharacteristicRoller } from '../../src/module/api/characteristic-roller.mjs';

describe('CharacteristicRoller', () => {
  let mockActor;
  let mockRoll;
  let mockCybernetic;

  beforeEach(() => {
    // Reset mock counts
    jest.clearAllMocks();

    // Mock cybernetic item
    mockCybernetic = {
      id: 'cyb001',
      name: 'Servo-Arm',
      type: 'cybernetic',
      system: {
        equipped: true,
        replacesCharacteristic: 'str',
        replacementValue: 75,
        unnaturalMultiplier: 2,
        replacementLabel: 'Servo-Arm'
      }
    };

    // Mock actor with characteristics
    mockActor = {
      id: 'actor123',
      name: 'Test Actor',
      type: 'character',
      system: {
        characteristics: {
          ws: { value: 50, mod: 5 },
          bs: { value: 45, mod: 4 },
          str: { value: 40, mod: 4 },
          tg: { value: 50, mod: 5 },
          ag: { value: 55, mod: 5 },
          int: { value: 35, mod: 3 },
          per: { value: 40, mod: 4 },
          wil: { value: 60, mod: 6 },
          fs: { value: 30, mod: 3 }
        }
      },
      items: [],
      getRollData: jest.fn(() => ({}))
    };

    // Mock roll
    mockRoll = {
      total: 42,
      evaluate: jest.fn(async () => mockRoll),
      toMessage: jest.fn(async (data) => ({ ...data, roll: mockRoll }))
    };

    global.Roll = jest.fn(() => mockRoll);

    // Mock game.actors
    global.game = {
      actors: {
        get: jest.fn((id) => (id === 'actor123' ? mockActor : null))
      },
      settings: {
        get: jest.fn((scope, key) => {
          if (scope === 'core' && key === 'rollMode') return 'roll';
          return null;
        })
      }
    };

    // Mock UI notifications
    global.ui = {
      notifications: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
      }
    };

    // Mock ChatMessage
    global.ChatMessage = {
      getSpeaker: jest.fn(() => ({ alias: mockActor.name })),
      create: jest.fn(async (data) => data)
    };

    // DialogV2 is already mocked in setup.mjs, just reset it
    // (Don't overwrite global.foundry or we'll lose the setup.mjs mocks)
  });

  // Note: _parseDifficulty() removed - functionality moved to RollApiHelper
  // See tests/api/roll-api-helper.test.mjs for difficulty parsing tests

  describe('rollCharacteristic', () => {
    it('should return null if actor not found', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('invalid-id', 'str');
      expect(result).toBe(null);
      expect(ui.notifications.error).toHaveBeenCalledWith(expect.stringContaining('Actor not found'));
    });

    it('should return null if characteristic key is invalid', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', '');
      expect(result).toBe(null);
      expect(ui.notifications.error).toHaveBeenCalledWith('Characteristic key must be provided');
    });

    it('should return null if characteristic not found', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'invalid');
      expect(result).toBe(null);
      expect(ui.notifications.error).toHaveBeenCalledWith(expect.stringContaining('Characteristic "invalid" not found'));
    });

    it('should show dialog by default', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'str');
      expect(foundry.applications.api.DialogV2.wait).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should skip dialog when skipDialog is true', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'str', { skipDialog: true });

      expect(foundry.applications.api.DialogV2.wait).not.toHaveBeenCalled();
      expect(global.Roll).toHaveBeenCalledWith('1d100', {});
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(mockRoll.toMessage).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should apply modifiers correctly', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'ag', {
        modifier: 10,
        difficulty: 'Easy',
        skipDialog: true
      });

      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(mockRoll.toMessage).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should accept uppercase characteristic keys', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'STR', { skipDialog: true });
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should accept mixed case characteristic keys', async () => {
      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'Ag', { skipDialog: true });
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should roll with cybernetic when useCybernetic is true', async () => {
      // Add cybernetic to actor
      mockActor.items = [mockCybernetic];

      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'str', {
        useCybernetic: true,
        skipDialog: true
      });

      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should use natural characteristic when useNatural is true', async () => {
      // Add cybernetic to actor
      mockActor.items = [mockCybernetic];

      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'str', {
        useNatural: true,
        skipDialog: true
      });

      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should default to natural characteristic when no options specified', async () => {
      // Add cybernetic to actor but don't specify useCybernetic
      mockActor.items = [mockCybernetic];

      const result = await CharacteristicRoller.rollCharacteristic('actor123', 'str', {
        skipDialog: true
      });

      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });
  });

  describe('getDifficulties', () => {
    it('should return difficulty presets', () => {
      const difficulties = CharacteristicRoller.getDifficulties();
      expect(difficulties).toHaveProperty('Easy', 30);
      expect(difficulties).toHaveProperty('Hard', -20);
      expect(difficulties).toHaveProperty('Challenging', 0);
      expect(difficulties).toHaveProperty('Trivial', 60);
      expect(difficulties).toHaveProperty('Hellish', -60);
    });

    it('should return a copy (not modify original)', () => {
      const difficulties1 = CharacteristicRoller.getDifficulties();
      const difficulties2 = CharacteristicRoller.getDifficulties();
      expect(difficulties1).toEqual(difficulties2);
      difficulties1.Easy = 999;
      expect(difficulties2.Easy).toBe(30);
    });
  });

  describe('getCharacteristics', () => {
    it('should return all characteristic keys and names', () => {
      const chars = CharacteristicRoller.getCharacteristics();
      expect(chars).toHaveProperty('ws', 'Weapon Skill');
      expect(chars).toHaveProperty('bs', 'Ballistic Skill');
      expect(chars).toHaveProperty('str', 'Strength');
      expect(chars).toHaveProperty('tg', 'Toughness');
      expect(chars).toHaveProperty('ag', 'Agility');
      expect(chars).toHaveProperty('int', 'Intelligence');
      expect(chars).toHaveProperty('per', 'Perception');
      expect(chars).toHaveProperty('wil', 'Willpower');
      expect(chars).toHaveProperty('fs', 'Fellowship');
    });

    it('should return a copy (not modify original)', () => {
      const chars1 = CharacteristicRoller.getCharacteristics();
      const chars2 = CharacteristicRoller.getCharacteristics();
      expect(chars1).toEqual(chars2);
      chars1.ws = 'Modified';
      expect(chars2.ws).toBe('Weapon Skill');
    });
  });
});
