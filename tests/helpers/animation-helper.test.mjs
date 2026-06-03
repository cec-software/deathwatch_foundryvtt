import { jest } from '@jest/globals';
import { AnimationHelper } from '../../src/module/helpers/ui/animation-helper.mjs';

describe('AnimationHelper', () => {
  describe('areAnimationLibrariesAvailable', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.game = {
        modules: {
          get: jest.fn()
        }
      };
    });

    it('returns false when Sequencer module is not active', () => {
      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: false };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const result = AnimationHelper.areAnimationLibrariesAvailable();

      expect(result).toBe(false);
    });

    it('returns false when JB2A modules are not active', () => {
      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: false };
        if (id === 'JB2A_DnD5e') return { active: false };
        return null;
      });

      const result = AnimationHelper.areAnimationLibrariesAvailable();

      expect(result).toBe(false);
    });

    it('returns true when Sequencer and JB2A Patreon are active', () => {
      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const result = AnimationHelper.areAnimationLibrariesAvailable();

      expect(result).toBe(true);
    });

    it('returns true when Sequencer and JB2A Free are active', () => {
      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'JB2A_DnD5e') return { active: true };
        return null;
      });

      const result = AnimationHelper.areAnimationLibrariesAvailable();

      expect(result).toBe(true);
    });
  });

  describe('classifyWeapon', () => {
    it('returns animationKey when provided', () => {
      const item = { name: 'Bolter', system: {} };
      const animationKey = 'plasma';

      const result = AnimationHelper.classifyWeapon(item, animationKey);

      expect(result).toBe('plasma');
    });

    it('returns bolt for bolter weapons', () => {
      const item = { name: 'Godwyn Pattern Bolter', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('bolt');
    });

    it('returns bolt for bolt pistol weapons', () => {
      const item = { name: 'Bolt Pistol', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('bolt');
    });

    it('returns las for lasgun weapons', () => {
      const item = { name: 'Lasgun', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('las');
    });

    it('returns las for hellgun weapons', () => {
      const item = { name: 'Hellgun', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('las');
    });

    it('returns plasma for plasma weapons', () => {
      const item = { name: 'Plasma Gun', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('plasma');
    });

    it('returns melta for meltagun weapons', () => {
      const item = { name: 'Meltagun', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('melta');
    });

    it('returns flame for flamer weapons', () => {
      const item = { name: 'Heavy Flamer', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('flame');
    });

    it('returns bolt for explosive damage type when name does not match', () => {
      const item = {
        name: 'Unknown Weapon',
        system: { dmgType: 'Explosive' }
      };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('bolt');
    });

    it('returns las for energy damage type when name does not match', () => {
      const item = {
        name: 'Unknown Weapon',
        system: { dmgType: 'Energy' }
      };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('las');
    });

    it('returns generic for unrecognized weapons', () => {
      const item = {
        name: 'Stub Revolver',
        system: { dmgType: 'Impact' }
      };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('generic');
    });

    it('handles case-insensitive weapon names', () => {
      const item = { name: 'PLASMA GUN', system: {} };

      const result = AnimationHelper.classifyWeapon(item, '');

      expect(result).toBe('plasma');
    });

    it('handles case-insensitive animationKey', () => {
      const item = { name: 'Bolter', system: {} };
      const animationKey = 'FLAME';

      const result = AnimationHelper.classifyWeapon(item, animationKey);

      expect(result).toBe('flame');
    });
  });

  describe('playWeaponAnimation', () => {
    let mockSequence;
    let mockEffect;

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock Sequence API - effect chain returns sequence for .play()
      mockEffect = {
        file: jest.fn().mockReturnThis(),
        atLocation: jest.fn().mockReturnThis(),
        stretchTo: jest.fn().mockReturnThis(),
        repeats: jest.fn().mockReturnValue(null) // End of effect chain
      };

      mockSequence = {
        effect: jest.fn(() => mockEffect),
        play: jest.fn()
      };

      global.Sequence = jest.fn(() => mockSequence);
    });

    it('plays animation from source to target', async () => {
      const sourceToken = { id: 'token1' };
      const targetToken = { id: 'token2' };
      const config = { file: 'jb2a.bullet.02.orange', delay: 150 };
      const rounds = 1;

      await AnimationHelper.playWeaponAnimation(sourceToken, targetToken, config, rounds);

      expect(global.Sequence).toHaveBeenCalled();
      expect(mockSequence.effect).toHaveBeenCalled();
      expect(mockEffect.file).toHaveBeenCalledWith('jb2a.bullet.02.orange');
      expect(mockEffect.atLocation).toHaveBeenCalledWith(sourceToken);
      expect(mockEffect.stretchTo).toHaveBeenCalledWith(targetToken);
      expect(mockEffect.repeats).toHaveBeenCalledWith(1, 150);
      expect(mockSequence.play).toHaveBeenCalled();
    });

    it('plays multiple rounds with correct delay', async () => {
      const sourceToken = { id: 'token1' };
      const targetToken = { id: 'token2' };
      const config = { file: 'jb2a.lasershot.blue', delay: 100 };
      const rounds = 5;

      await AnimationHelper.playWeaponAnimation(sourceToken, targetToken, config, rounds);

      expect(mockEffect.repeats).toHaveBeenCalledWith(5, 100);
    });

    it('handles animation errors gracefully', async () => {
      const sourceToken = { id: 'token1' };
      const targetToken = { id: 'token2' };
      const config = { file: 'jb2a.bullet.02.orange', delay: 150 };
      const rounds = 1;

      mockSequence.play.mockImplementation(() => {
        throw new Error('Animation failed');
      });

      // Should not throw
      await expect(
        AnimationHelper.playWeaponAnimation(sourceToken, targetToken, config, rounds)
      ).resolves.not.toThrow();
    });
  });

  describe('playGrenadeAnimation', () => {
    let mockSequence;

    beforeEach(() => {
      mockSequence = {
        effect: jest.fn().mockReturnThis(),
        file: jest.fn().mockReturnThis(),
        atLocation: jest.fn().mockReturnThis(),
        stretchTo: jest.fn().mockReturnThis(),
        waitUntilFinished: jest.fn().mockReturnThis(),
        scaleToObject: jest.fn().mockReturnThis(),
        belowTokens: jest.fn().mockReturnThis(),
        scaleIn: jest.fn().mockReturnThis(),
        duration: jest.fn().mockReturnThis(),
        fadeOut: jest.fn().mockReturnThis(),
        play: jest.fn().mockResolvedValue(undefined)
      };
      global.Sequence = jest.fn(() => mockSequence);
    });

    afterEach(() => {
      delete global.Sequence;
    });

    it('should create a 4-stage animation sequence', async () => {
      const sourceToken = { id: 'token1' };
      const targetLocation = { x: 300, y: 400 };
      const weapon = { name: 'Frag Grenade' };

      await AnimationHelper.playGrenadeAnimation(sourceToken, targetLocation, weapon);

      expect(mockSequence.effect).toHaveBeenCalledTimes(4);
      expect(mockSequence.play).toHaveBeenCalled();
    });

    it('should use correct JB2A file paths', async () => {
      const sourceToken = { id: 'token1' };
      const targetLocation = { x: 300, y: 400 };
      const weapon = { name: 'Frag Grenade' };

      await AnimationHelper.playGrenadeAnimation(sourceToken, targetLocation, weapon);

      expect(mockSequence.file).toHaveBeenCalledWith('jb2a.throwable.throw.bomb.01.black');
      expect(mockSequence.file).toHaveBeenCalledWith('jb2a.explosion.shrapnel.bomb.01.black');
      expect(mockSequence.file).toHaveBeenCalledWith('jb2a.explosion.08.orange');
      expect(mockSequence.file).toHaveBeenCalledWith('jb2a.impact.ground_crack.orange');
    });

    it('should target location objects not tokens', async () => {
      const sourceToken = { id: 'token1' };
      const targetLocation = { x: 500, y: 600 };
      const weapon = { name: 'Frag Grenade' };

      await AnimationHelper.playGrenadeAnimation(sourceToken, targetLocation, weapon);

      expect(mockSequence.atLocation).toHaveBeenCalledWith(sourceToken);
      expect(mockSequence.stretchTo).toHaveBeenCalledWith(targetLocation);
    });

    it('should await the sequence play call', async () => {
      const sourceToken = { id: 'token1' };
      const targetLocation = { x: 100, y: 200 };
      const weapon = { name: 'Frag Grenade' };

      await AnimationHelper.playGrenadeAnimation(sourceToken, targetLocation, weapon);

      expect(mockSequence.play).toHaveBeenCalled();
    });
  });

  describe('getAnimationConfig', () => {
    it('returns bolt configuration', () => {
      const result = AnimationHelper.getAnimationConfig('bolt');

      expect(result).toEqual({
        file: 'jb2a.bullet.02.orange',
        delay: 150
      });
    });

    it('returns las configuration', () => {
      const result = AnimationHelper.getAnimationConfig('las');

      expect(result).toEqual({
        file: 'jb2a.lasershot.red',
        delay: 100
      });
    });

    it('returns plasma configuration', () => {
      const result = AnimationHelper.getAnimationConfig('plasma');

      expect(result).toEqual({
        file: 'jb2a.lasershot.blue',
        delay: 200
      });
    });

    it('returns melta configuration', () => {
      const result = AnimationHelper.getAnimationConfig('melta');

      expect(result).toEqual({
        file: 'jb2a.scorching_ray.01.orange',
        delay: 250
      });
    });

    it('returns flame configuration', () => {
      const result = AnimationHelper.getAnimationConfig('flame');

      expect(result).toEqual({
        file: 'jb2a.burning_hands.01.orange',
        delay: 0
      });
    });

    it('returns generic configuration for unknown types', () => {
      const result = AnimationHelper.getAnimationConfig('unknown');

      expect(result).toEqual({
        file: 'jb2a.bullet.01.orange',
        delay: 150
      });
    });

    it('returns generic configuration as fallback', () => {
      const result = AnimationHelper.getAnimationConfig('generic');

      expect(result).toEqual({
        file: 'jb2a.bullet.01.orange',
        delay: 150
      });
    });
  });
});
