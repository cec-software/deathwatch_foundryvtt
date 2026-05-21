/**
 * @file Token Action HUD initialization tests
 */

import { jest } from '@jest/globals';

describe('Token Action HUD Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure game.modules exists
    game.modules = game.modules || new Map();
    game.modules.get = jest.fn();
  });

  describe('registerSettings', () => {
    it('should register enableTokenActionHUD setting', async () => {
      const { SettingsRegistrar } = await import('../../src/module/init/settings.mjs');

      SettingsRegistrar.register();

      expect(game.settings.register).toHaveBeenCalledWith(
        'deathwatch',
        'enableTokenActionHUD',
        expect.objectContaining({
          name: 'Enable Token Action HUD',
          hint: 'Enable Token Action HUD integration. Requires Token Action HUD Core module to be active. Changes require reload.',
          scope: 'world',
          config: true,
          type: Boolean,
          default: false
        })
      );
    });

    it('should not throw if TAH Core is not active', async () => {
      game.modules.get = jest.fn().mockReturnValue(undefined);

      const { SettingsRegistrar } = await import('../../src/module/init/settings.mjs');

      expect(() => SettingsRegistrar.register()).not.toThrow();
    });
  });

  describe('shouldLoadTAH', () => {
    it('should return false if setting is disabled', async () => {
      game.settings.get = jest.fn().mockReturnValue(false);
      game.modules.get = jest.fn().mockReturnValue({ active: true });

      const { shouldLoadTAH } = await import('../../src/module/token-action-hud/init.mjs');

      expect(shouldLoadTAH()).toBe(false);
    });

    it('should return false if TAH Core is not active', async () => {
      game.settings.get = jest.fn().mockReturnValue(true);
      game.modules.get = jest.fn().mockReturnValue(undefined);

      const { shouldLoadTAH } = await import('../../src/module/token-action-hud/init.mjs');

      expect(shouldLoadTAH()).toBe(false);
    });

    it('should return true if setting enabled and TAH Core active', async () => {
      game.settings.get = jest.fn().mockReturnValue(true);
      game.modules.get = jest.fn().mockReturnValue({ active: true });

      const { shouldLoadTAH } = await import('../../src/module/token-action-hud/init.mjs');

      expect(shouldLoadTAH()).toBe(true);
    });
  });
});
