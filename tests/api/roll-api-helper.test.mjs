import { jest } from '@jest/globals';
import { RollApiHelper } from '../../src/module/api/roll-api-helper.mjs';

describe('RollApiHelper', () => {
  describe('parseDifficulty', () => {
    it('should parse numeric difficulty', () => {
      expect(RollApiHelper.parseDifficulty(20)).toBe(20);
      expect(RollApiHelper.parseDifficulty(-30)).toBe(-30);
      expect(RollApiHelper.parseDifficulty(0)).toBe(0);
    });

    it('should parse difficulty preset strings (capitalized)', () => {
      expect(RollApiHelper.parseDifficulty('Easy')).toBe(30);
      expect(RollApiHelper.parseDifficulty('Hard')).toBe(-20);
      expect(RollApiHelper.parseDifficulty('Challenging')).toBe(0);
      expect(RollApiHelper.parseDifficulty('Trivial')).toBe(60);
      expect(RollApiHelper.parseDifficulty('Hellish')).toBe(-60);
    });

    it('should parse difficulty preset strings (lowercase)', () => {
      expect(RollApiHelper.parseDifficulty('easy')).toBe(30);
      expect(RollApiHelper.parseDifficulty('hard')).toBe(-20);
      expect(RollApiHelper.parseDifficulty('challenging')).toBe(0);
    });

    it('should return 0 for invalid difficulty', () => {
      expect(RollApiHelper.parseDifficulty('invalid')).toBe(0);
      expect(RollApiHelper.parseDifficulty(null)).toBe(0);
      expect(RollApiHelper.parseDifficulty(undefined)).toBe(0);
      expect(RollApiHelper.parseDifficulty('')).toBe(0);
    });
  });

  describe('executeWithDialog', () => {
    beforeEach(() => {
      // Mock for executeWithDialog tests
      global.game = {};
      global.ui = {};
    });

    it('should execute directly if skipDialog is true', async () => {
      const mockActor = { id: 'actor-123' };
      const executeFn = jest.fn().mockResolvedValue('direct result');
      const showDialogFn = jest.fn();

      const result = await RollApiHelper.executeWithDialog(
        mockActor,
        executeFn,
        showDialogFn,
        [],
        true // skipDialog
      );

      expect(result).toBe('direct result');
      expect(executeFn).toHaveBeenCalledWith(mockActor, []);
      expect(showDialogFn).not.toHaveBeenCalled();
    });

    it('should execute directly if modifiers are provided', async () => {
      const mockActor = { id: 'actor-123' };
      const modifiers = [{ label: 'Test', value: 10 }];
      const executeFn = jest.fn().mockResolvedValue('modified result');
      const showDialogFn = jest.fn();

      const result = await RollApiHelper.executeWithDialog(
        mockActor,
        executeFn,
        showDialogFn,
        modifiers,
        false // skipDialog = false, but modifiers present
      );

      expect(result).toBe('modified result');
      expect(executeFn).toHaveBeenCalledWith(mockActor, modifiers);
      expect(showDialogFn).not.toHaveBeenCalled();
    });

    it('should show dialog if skipDialog false and no modifiers', async () => {
      const mockActor = { id: 'actor-123' };
      const executeFn = jest.fn();
      const showDialogFn = jest.fn().mockResolvedValue('dialog result');

      const result = await RollApiHelper.executeWithDialog(
        mockActor,
        executeFn,
        showDialogFn,
        [],
        false // skipDialog
      );

      expect(result).toBe('dialog result');
      expect(showDialogFn).toHaveBeenCalledWith(mockActor);
      expect(executeFn).not.toHaveBeenCalled();
    });
  });
});
