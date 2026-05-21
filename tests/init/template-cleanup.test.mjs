import { jest } from '@jest/globals';

// Mock Hooks before importing the module
let updateCombatCallback;
global.Hooks = {
  on: jest.fn((hook, callback) => {
    if (hook === 'updateCombat') updateCombatCallback = callback;
  })
};

// Mock ui.notifications
global.ui = {
  notifications: {
    error: jest.fn()
  }
};

import { registerTemplateCleanupHook } from '../../src/module/init/template-cleanup.mjs';

describe('Template Cleanup Hook', () => {
  let mockCombat, mockRegion, mockScene, mockCanvas;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock canvas and scene
    mockScene = {
      deleteEmbeddedDocuments: jest.fn().mockResolvedValue([])
    };

    mockRegion = {
      document: {
        id: 'region-1',
        flags: {
          deathwatch: {
            isAttackTemplate: true,
            createdByTurn: 1,
            createdInRound: 1
          }
        }
      }
    };

    mockCanvas = {
      scene: mockScene,
      regions: {
        placeables: [mockRegion]
      }
    };

    global.canvas = mockCanvas;

    // Mock combat
    mockCombat = {
      current: { turn: 2, round: 1 },
      previous: { turn: 1, round: 1 }
    };

    // Register the hook
    registerTemplateCleanupHook();
  });

  test('deletes regions from previous turn', async () => {
    const changed = { turn: 2 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).toHaveBeenCalledWith('Region', ['region-1']);
  });

  test('does not delete regions without deathwatch flags', async () => {
    mockRegion.document.flags = {};
    const changed = { turn: 2 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });

  test('does not clean up when turn does not change', async () => {
    const changed = { initiative: 10 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });

  test('does not clean up when no previous turn', async () => {
    mockCombat.previous = null;
    const changed = { turn: 2 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });

  test('does not clean up when canvas.scene is not available', async () => {
    global.canvas = { scene: null };
    const changed = { turn: 2 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });

  test('handles multiple regions from previous turn', async () => {
    const mockRegion2 = {
      document: {
        id: 'region-2',
        flags: {
          deathwatch: {
            isAttackTemplate: true,
            createdByTurn: 1,
            createdInRound: 1
          }
        }
      }
    };

    mockCanvas.regions.placeables = [mockRegion, mockRegion2];
    global.canvas = mockCanvas;

    const changed = { turn: 2 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).toHaveBeenCalledWith('Region', ['region-1', 'region-2']);
  });

  test('only deletes regions from the previous turn, not older turns', async () => {
    const oldRegion = {
      document: {
        id: 'old-region',
        flags: {
          deathwatch: {
            isAttackTemplate: true,
            createdByTurn: 0,
            createdInRound: 1
          }
        }
      }
    };

    mockCanvas.regions.placeables = [mockRegion, oldRegion];
    global.canvas = mockCanvas;

    const changed = { turn: 2 };
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).toHaveBeenCalledWith('Region', ['region-1']);
  });

  test('cleans up when round changes', async () => {
    const changed = { round: 2 };
    mockCombat.current.round = 2;
    await updateCombatCallback(mockCombat, changed, {}, 'user-id');

    expect(mockScene.deleteEmbeddedDocuments).toHaveBeenCalledWith('Region', ['region-1']);
  });
});
