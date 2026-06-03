import { jest } from '@jest/globals';
import { SkillRoller } from '../../src/module/api/skill-roller.mjs';
import { Validation } from '../../src/module/helpers/validation.mjs';

describe('SkillRoller', () => {
  let mockActor;
  let mockRoll;

  beforeEach(() => {
    // Reset mock counts
    jest.clearAllMocks();
    // Mock actor with skills
    mockActor = {
      id: 'actor123',
      name: 'Test Actor',
      type: 'character',
      system: {
        characteristics: {
          ag: { value: 50, mod: 5 },
          per: { value: 40, mod: 4 },
          wil: { value: 60, mod: 6 }
        },
        skills: {
          dodge: {
            label: 'Dodge',
            characteristic: 'ag',
            isBasic: true,
            trained: true,
            expert: false,
            mastered: false,
            modifier: 0,
            modifierTotal: 0,
            total: 50
          },
          awareness: {
            label: 'Awareness',
            characteristic: 'per',
            isBasic: true,
            trained: true,
            expert: false,
            mastered: false,
            modifier: 10,
            modifierTotal: 5,
            total: 55
          },
          'forbidden-lore': {
            label: 'Forbidden Lore',
            characteristic: 'int',
            isBasic: false,
            trained: false,
            expert: false,
            mastered: false,
            modifier: 0,
            modifierTotal: 0,
            total: 0
          },
          command: {
            label: 'Command',
            characteristic: 'wil',
            isBasic: false,
            trained: true,
            expert: true,
            mastered: false,
            modifier: 0,
            modifierTotal: 0,
            total: 80
          }
        }
      },
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

  describe('_findSkillKey', () => {
    it('should find skill by exact key match', () => {
      const result = SkillRoller._findSkillKey(mockActor.system.skills, 'dodge');
      expect(result).toBe('dodge');
    });

    it('should find skill by label (case-insensitive)', () => {
      const result = SkillRoller._findSkillKey(mockActor.system.skills, 'Awareness');
      expect(result).toBe('awareness');
    });

    it('should find skill with hyphenated key', () => {
      const result = SkillRoller._findSkillKey(mockActor.system.skills, 'forbidden-lore');
      expect(result).toBe('forbidden-lore');
    });

    it('should return null for non-existent skill', () => {
      const result = SkillRoller._findSkillKey(mockActor.system.skills, 'non-existent');
      expect(result).toBe(null);
    });

    it('should handle case-insensitive key match', () => {
      const result = SkillRoller._findSkillKey(mockActor.system.skills, 'DODGE');
      expect(result).toBe('dodge');
    });
  });

  // Note: _parseDifficulty() removed - functionality moved to RollApiHelper
  // See tests/api/roll-api-helper.test.mjs for difficulty parsing tests

  describe('rollSkill', () => {
    it('should return null if actor not found', async () => {
      const result = await SkillRoller.rollSkill('invalid-id', 'dodge');
      expect(result).toBe(null);
      expect(ui.notifications.error).toHaveBeenCalledWith(expect.stringContaining('Actor not found'));
    });

    it('should return null if skill name is invalid', async () => {
      const result = await SkillRoller.rollSkill('actor123', '');
      expect(result).toBe(null);
      expect(ui.notifications.error).toHaveBeenCalledWith('Skill name must be provided');
    });

    it('should return null if skill not found', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'invalid-skill');
      expect(result).toBe(null);
      expect(ui.notifications.error).toHaveBeenCalledWith(expect.stringContaining('Skill "invalid-skill" not found'));
    });

    it('should warn if skill is untrained advanced skill', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'forbidden-lore');
      expect(result).toBe(null);
      expect(ui.notifications.warn).toHaveBeenCalledWith(expect.stringContaining('must be trained'));
    });

    it('should show dialog by default', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'dodge');
      // Since dialog returns null in our mock, result should be null
      expect(foundry.applications.api.DialogV2.wait).toHaveBeenCalled();
      expect(result).toBe(null);
    });

    it('should skip dialog when skipDialog is true', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'dodge', { skipDialog: true });

      expect(foundry.applications.api.DialogV2.wait).not.toHaveBeenCalled();
      expect(global.Roll).toHaveBeenCalledWith('1d100', {});
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(mockRoll.toMessage).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should apply modifiers correctly', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'dodge', {
        modifier: 10,
        difficulty: 'Easy',
        skipDialog: true
      });

      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(mockRoll.toMessage).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should handle expert skill bonus', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'command', { skipDialog: true });
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(mockRoll.toMessage).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });

    it('should find skill by label', async () => {
      const result = await SkillRoller.rollSkill('actor123', 'Command', { skipDialog: true });
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(mockRoll.toMessage).toHaveBeenCalled();
      expect(result).toBe(mockRoll);
    });
  });

  describe('getDifficulties', () => {
    it('should return difficulty presets', () => {
      const difficulties = SkillRoller.getDifficulties();
      expect(difficulties).toHaveProperty('Easy', 30);
      expect(difficulties).toHaveProperty('Hard', -20);
      expect(difficulties).toHaveProperty('Challenging', 0);
      expect(difficulties).toHaveProperty('Trivial', 60);
      expect(difficulties).toHaveProperty('Hellish', -60);
    });

    it('should return a copy (not modify original)', () => {
      const difficulties1 = SkillRoller.getDifficulties();
      const difficulties2 = SkillRoller.getDifficulties();
      expect(difficulties1).toEqual(difficulties2);
      difficulties1.Easy = 999;
      expect(difficulties2.Easy).toBe(30);
    });
  });
});
