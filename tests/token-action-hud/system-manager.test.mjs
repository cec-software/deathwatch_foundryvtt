/**
 * @file Tests for Token Action HUD SystemManager
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { createSystemManager } from '../../src/module/token-action-hud/system-manager.mjs';

describe('Token Action HUD - SystemManager', () => {
  describe('createSystemManager', () => {
    it('should create a SystemManager class that extends the base', () => {
      class MockBaseSystemManager {
        constructor() {
          this.baseCalled = true;
        }
      }

      const SystemManager = createSystemManager(MockBaseSystemManager);
      expect(SystemManager).toBeDefined();
      expect(typeof SystemManager).toBe('function');

      const instance = new SystemManager();
      expect(instance.baseCalled).toBe(true);
    });
  });

  describe('SystemManager instance', () => {
    let SystemManager;
    let manager;

    beforeEach(() => {
      class MockBaseSystemManager {
        constructor() {}
      }

      SystemManager = createSystemManager(MockBaseSystemManager);
      manager = new SystemManager();
    });

    describe('getActionHandler', () => {
      it('should return null (not yet implemented)', () => {
        expect(manager.getActionHandler()).toBeNull();
      });
    });

    describe('getRollHandler', () => {
      it('should return null (not yet implemented)', () => {
        expect(manager.getRollHandler()).toBeNull();
      });
    });

    describe('getAvailableRollHandlers', () => {
      it('should return an array with the Deathwatch roll handler', () => {
        const handlers = manager.getAvailableRollHandlers();
        expect(Array.isArray(handlers)).toBe(true);
        expect(handlers).toHaveLength(1);
        expect(handlers[0]).toEqual({
          id: 'deathwatch',
          name: 'Deathwatch'
        });
      });
    });

    describe('registerDefaults', () => {
      it('should return an object with layout and groups', () => {
        const defaults = manager.registerDefaults();
        expect(defaults).toBeDefined();
        expect(defaults.layout).toBeDefined();
        expect(defaults.groups).toBeDefined();
      });

      it('should have 4 top-level layout groups', () => {
        const defaults = manager.registerDefaults();
        expect(defaults.layout).toHaveLength(4);
        expect(defaults.layout[0].id).toBe('combat');
        expect(defaults.layout[1].id).toBe('skills');
        expect(defaults.layout[2].id).toBe('characteristics');
        expect(defaults.layout[3].id).toBe('psychic-powers');
      });

      it('should have Combat group with 4 subgroups', () => {
        const defaults = manager.registerDefaults();
        const combat = defaults.layout[0];
        expect(combat.name).toBe('Combat');
        expect(combat.type).toBe('system');
        expect(combat.groups).toHaveLength(4);
        expect(combat.groups[0].id).toBe('ranged-weapons');
        expect(combat.groups[1].id).toBe('melee-weapons');
        expect(combat.groups[2].id).toBe('grenades');
        expect(combat.groups[3].id).toBe('combat-actions');
      });

      it('should have Skills group with 2 subgroups', () => {
        const defaults = manager.registerDefaults();
        const skills = defaults.layout[1];
        expect(skills.name).toBe('Skills');
        expect(skills.type).toBe('system');
        expect(skills.groups).toHaveLength(2);
        expect(skills.groups[0].id).toBe('basic-skills');
        expect(skills.groups[1].id).toBe('advanced-skills');
      });

      it('should have Characteristics group with 9 subgroups', () => {
        const defaults = manager.registerDefaults();
        const characteristics = defaults.layout[2];
        expect(characteristics.name).toBe('Characteristics');
        expect(characteristics.type).toBe('system');
        expect(characteristics.groups).toHaveLength(9);
        // Verify using CHARACTERISTICS constant (source of truth)
        expect(characteristics.groups[0].id).toBe('char-ws');
        expect(characteristics.groups[1].id).toBe('char-bs');
        expect(characteristics.groups[2].id).toBe('char-str');
        expect(characteristics.groups[3].id).toBe('char-tg');
        expect(characteristics.groups[4].id).toBe('char-ag');
        expect(characteristics.groups[5].id).toBe('char-int');
        expect(characteristics.groups[6].id).toBe('char-per');
        expect(characteristics.groups[7].id).toBe('char-wil');
        expect(characteristics.groups[8].id).toBe('char-fs');
      });

      it('should include psychic-powers group in groups', () => {
        const defaults = manager.registerDefaults();
        const psychicPowersGroup = defaults.groups.find(g => g.id === 'psychic-powers');
        expect(psychicPowersGroup).toBeDefined();
        expect(psychicPowersGroup.name).toBe('Psychic Powers');
        expect(psychicPowersGroup.type).toBe('system');
      });

      it('should have Psychic Powers as 4th top-level layout group', () => {
        const defaults = manager.registerDefaults();
        expect(defaults.layout).toHaveLength(4);
        expect(defaults.layout[3].id).toBe('psychic-powers');
        expect(defaults.layout[3].name).toBe('Psychic Powers');
      });

      it('should have Psychic Powers group with psychic-powers subgroup', () => {
        const defaults = manager.registerDefaults();
        const psychicPowersLayout = defaults.layout[3];
        expect(psychicPowersLayout.groups).toHaveLength(1);
        expect(psychicPowersLayout.groups[0].id).toBe('psychic-powers');
        expect(psychicPowersLayout.groups[0].nestId).toBe('psychic-powers_psychic-powers');
      });
    });
  });
});
