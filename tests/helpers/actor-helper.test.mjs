import { jest } from '@jest/globals';
import { ActorHelper } from '../../src/module/helpers/actor-helper.mjs';

describe('ActorHelper', () => {
  beforeEach(() => {
    // Mock game.actors
    global.game = {
      actors: {
        get: jest.fn()
      }
    };

    // Mock ui.notifications
    global.ui = {
      notifications: {
        error: jest.fn()
      }
    };
  });

  describe('validateActor', () => {
    it('should return actor if found', () => {
      const mockActor = { id: 'actor-123', name: 'Test Actor' };
      global.game.actors.get = jest.fn().mockReturnValue(mockActor);

      const result = ActorHelper.validateActor('actor-123', 'CHARACTER.CHARACTERISTICS');
      expect(result).toBe(mockActor);
      expect(game.actors.get).toHaveBeenCalledWith('actor-123');
    });

    it('should return null and show error if actor not found', () => {
      global.game.actors.get = jest.fn().mockReturnValue(null);
      global.ui.notifications.error = jest.fn();

      const result = ActorHelper.validateActor('invalid-id', 'CHARACTER.CHARACTERISTICS');
      expect(result).toBeNull();
      expect(ui.notifications.error).toHaveBeenCalledWith('Actor not found: invalid-id');
    });
  });
});
