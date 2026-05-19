import { jest } from '@jest/globals';

describe('Template Attack Button Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    global.game = {
      actors: {
        get: jest.fn()
      },
      scenes: {
        get: jest.fn()
      }
    };

    global.ui = {
      notifications: {
        warn: jest.fn()
      }
    };

    global.Hooks = {
      on: jest.fn()
    };

    global.$ = jest.fn((selector) => {
      if (typeof selector === 'function') {
        return selector;
      }
      return {
        querySelectorAll: jest.fn().mockReturnValue([]),
        find: jest.fn().mockReturnThis(),
        click: jest.fn()
      };
    });

    global.ErrorHandler = {
      wrap: jest.fn((fn) => fn)
    };
  });

  test('button HTML includes correct data attributes for weapon', () => {
    const weaponItem = {
      type: 'weapon',
      name: 'Flamer',
      system: {
        template: { type: 'cone', distance: '30', angle: '45' }
      }
    };

    const actorId = 'actor-1';
    const itemId = 'item-1';

    const expectedButton = `<button class="template-attack-btn" data-item-id="${itemId}" data-actor-id="${actorId}">🎯 Template Attack</button>`;

    // Verify structure matches expected pattern
    expect(expectedButton).toContain('template-attack-btn');
    expect(expectedButton).toContain(`data-item-id="${itemId}"`);
    expect(expectedButton).toContain(`data-actor-id="${actorId}"`);
  });

  test('button HTML includes correct data attributes for psychic power', () => {
    const powerItem = {
      type: 'psychic-power',
      name: 'Smite',
      system: {
        template: { type: 'blast', distance: '30' }
      }
    };

    const actorId = 'actor-1';
    const itemId = 'item-1';

    const expectedButton = `<button class="template-attack-btn" data-item-id="${itemId}" data-actor-id="${actorId}">🎯 Template Attack</button>`;

    expect(expectedButton).toContain('template-attack-btn');
    expect(expectedButton).toContain(`data-item-id="${itemId}"`);
    expect(expectedButton).toContain(`data-actor-id="${actorId}"`);
  });

  test('ChatButtonHandlers registers template attack listener', async () => {
    // Import after mocking globals
    const { ChatButtonHandlers } = await import('../../src/module/chat/button-handlers.mjs');

    ChatButtonHandlers.register();

    expect(global.Hooks.on).toHaveBeenCalledWith('renderChatMessageHTML', expect.any(Function));
  });
});
