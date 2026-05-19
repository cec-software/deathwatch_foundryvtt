import { jest } from '@jest/globals';
import { registerTemplateCleanupHook } from '../../src/module/init/template-cleanup.mjs';

describe('Template Cleanup Hook', () => {
  test('deletes templates from previous turn', async () => {
    const mockDelete = jest.fn();
    const mockTemplates = [
      {
        document: { delete: mockDelete },
        flags: {
          deathwatch: {
            createdByTurn: 0,
            createdInRound: 1,
            isAttackTemplate: true
          }
        }
      }
    ];

    global.canvas = {
      templates: {
        placeables: mockTemplates
      }
    };

    global.Hooks = {
      on: jest.fn()
    };

    registerTemplateCleanupHook();

    // Get the registered callback
    const callback = global.Hooks.on.mock.calls[0][1];

    // Simulate combat turn change
    const combat = {
      previous: { turn: 0, round: 1 }
    };
    const changed = { turn: 1 };

    callback(combat, changed, {}, 'user-1');

    expect(mockDelete).toHaveBeenCalled();
  });

  test('does not delete templates without deathwatch flags', async () => {
    const mockDelete = jest.fn();
    const mockTemplates = [
      {
        document: { delete: mockDelete },
        flags: {}
      }
    ];

    global.canvas = {
      templates: {
        placeables: mockTemplates
      }
    };

    global.Hooks = {
      on: jest.fn()
    };

    registerTemplateCleanupHook();

    const callback = global.Hooks.on.mock.calls[0][1];
    const combat = {
      previous: { turn: 0, round: 1 }
    };
    const changed = { turn: 1 };

    callback(combat, changed, {}, 'user-1');

    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('does not clean up when turn/round not changed', async () => {
    const mockDelete = jest.fn();
    const mockTemplates = [
      {
        document: { delete: mockDelete },
        flags: {
          deathwatch: {
            createdByTurn: 0,
            createdInRound: 1,
            isAttackTemplate: true
          }
        }
      }
    ];

    global.canvas = {
      templates: {
        placeables: mockTemplates
      }
    };

    global.Hooks = {
      on: jest.fn()
    };

    registerTemplateCleanupHook();

    const callback = global.Hooks.on.mock.calls[0][1];
    const combat = {
      previous: { turn: 0, round: 1 }
    };
    const changed = { initiative: 5 }; // Something else changed

    callback(combat, changed, {}, 'user-1');

    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('does not clean up if no previous combat state', async () => {
    const mockDelete = jest.fn();
    const mockTemplates = [
      {
        document: { delete: mockDelete },
        flags: {
          deathwatch: {
            createdByTurn: 0,
            createdInRound: 1,
            isAttackTemplate: true
          }
        }
      }
    ];

    global.canvas = {
      templates: {
        placeables: mockTemplates
      }
    };

    global.Hooks = {
      on: jest.fn()
    };

    registerTemplateCleanupHook();

    const callback = global.Hooks.on.mock.calls[0][1];
    const combat = {}; // No previous state
    const changed = { turn: 1 };

    callback(combat, changed, {}, 'user-1');

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
