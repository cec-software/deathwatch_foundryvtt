/**
 * @file Token Action HUD initialization and settings
 * @module token-action-hud/init
 */

import { Logger } from '../helpers/logger.mjs';
import { initializeSystemManager, SystemManager } from './system-manager.mjs';
import { initializeActionHandler, ActionHandler } from './action-handler.mjs';
import { initializeRollHandler, RollHandler } from './roll-handler.mjs';
import { TAHSkillSelector, DEFAULT_TAH_SKILLS } from './skill-selector.mjs';

const logger = Logger.category('TAH.INIT');

// Register hook at module load time (not in initialize function)
// Skip if Hooks is not available (e.g., in test environment)
if (typeof Hooks !== 'undefined') {
  Hooks.on('tokenActionHudCoreApiReady', async (coreModule) => {
  logger.debug('TAH Core API ready hook fired');

  try {
    // Initialize our handler classes with TAH Core base classes
    initializeActionHandler(coreModule);
    initializeRollHandler(coreModule);
    initializeSystemManager(coreModule);

    // Register our system with TAH Core
    // Systems register via plain object (not game.modules.get like modules do)
    const systemModule = {
      id: 'deathwatch',
      api: {
        requiredCoreModuleVersion: '2',
        SystemManager
      }
    };

    Hooks.call('tokenActionHudSystemReady', systemModule);
    logger.info('System module registered with TAH Core');
  } catch (error) {
    logger.error('Failed to register with TAH Core:', error);
  }
  });
}

/**
 * Register Token Action HUD settings
 */
export function registerSettings() {
  try {
    game.settings.register('deathwatch', 'enableTokenActionHUD', {
      name: 'DEATHWATCH.Settings.EnableTokenActionHUD.Name',
      hint: 'DEATHWATCH.Settings.EnableTokenActionHUD.Hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      requiresReload: true
    });

    // Skill selection list (per-client setting)
    game.settings.register('deathwatch', 'tahSkillList', {
      scope: 'client',
      config: false,
      type: Array,
      default: DEFAULT_TAH_SKILLS
    });

    // Skill selection menu
    game.settings.registerMenu('deathwatch', 'tahSkillSelector', {
      name: 'Select TAH Skills',
      label: 'Skill Selection',
      hint: 'Choose which skills appear in your Token Action HUD (to avoid clutter)',
      icon: 'fas fa-brain',
      type: TAHSkillSelector,
      restricted: false
    });

    logger.debug('Token Action HUD settings registered');
  } catch (error) {
    logger.warn('Failed to register Token Action HUD settings:', error);
  }
}

/**
 * Check if Token Action HUD should be loaded
 * @returns {boolean} True if setting enabled AND TAH Core is active
 */
export function shouldLoadTAH() {
  const settingEnabled = game.settings.get('deathwatch', 'enableTokenActionHUD');
  const tahCore = game.modules.get('token-action-hud-core');
  const isTAHActive = tahCore?.active ?? false;

  if (settingEnabled && !isTAHActive) {
    logger.warn('Token Action HUD setting enabled but TAH Core module not active');
    return false;
  }

  return settingEnabled && isTAHActive;
}

/**
 * Initialize Token Action HUD integration
 * Called during ready hook if shouldLoadTAH() returns true
 *
 * Note: The actual hook registration happens at module load time (see top of file)
 * This function is now a no-op placeholder for backwards compatibility
 */
export function initialize() {
  logger.info('Token Action HUD integration initialized (hook registered at module load)');
}
