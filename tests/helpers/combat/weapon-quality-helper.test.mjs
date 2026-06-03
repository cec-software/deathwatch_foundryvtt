import { jest } from '@jest/globals';
import { WeaponQualityHelper } from '../../../src/module/helpers/combat/weapon-quality-helper.mjs';

describe('WeaponQualityHelper.checkMultipleQualities', () => {
  let mockWeapon;
  let mockPack;

  beforeEach(() => {
    // Mock weapon with attached qualities
    mockWeapon = {
      system: {
        attachedQualities: [
          { id: 'quality-1', value: 2 },
          { id: 'quality-2', value: 0 },
          'quality-3'
        ]
      }
    };

    // Mock quality pack
    mockPack = {
      getDocument: jest.fn()
    };

    global.game = {
      packs: {
        get: jest.fn().mockReturnValue(mockPack)
      }
    };

    // Mock quality documents
    mockPack.getDocument.mockImplementation((id) => {
      const qualities = {
        'quality-1': { system: { key: 'accurate' } },
        'quality-2': { system: { key: 'storm' } },
        'quality-3': { system: { key: 'twin-linked' } }
      };
      return Promise.resolve(qualities[id] || null);
    });
  });

  it('should return object with all requested qualities', async () => {
    const result = await WeaponQualityHelper.checkMultipleQualities(mockWeapon, [
      'accurate', 'storm', 'scatter', 'twin-linked'
    ]);

    expect(result).toEqual({
      'accurate': true,
      'storm': true,
      'scatter': false,
      'twin-linked': true
    });
  });

  it('should return all false if no qualities match', async () => {
    const result = await WeaponQualityHelper.checkMultipleQualities(mockWeapon, [
      'tearing', 'shocking', 'toxic'
    ]);

    expect(result).toEqual({
      'tearing': false,
      'shocking': false,
      'toxic': false
    });
  });

  it('should handle empty quality array', async () => {
    const result = await WeaponQualityHelper.checkMultipleQualities(mockWeapon, []);
    expect(result).toEqual({});
  });

  it('should handle weapon with no attachedQualities', async () => {
    const emptyWeapon = { system: { attachedQualities: [] } };
    const result = await WeaponQualityHelper.checkMultipleQualities(emptyWeapon, [
      'accurate', 'storm'
    ]);

    expect(result).toEqual({
      'accurate': false,
      'storm': false
    });
  });

  it('should match against existing hasQuality behavior', async () => {
    // Check individual hasQuality calls
    const hasAccurate = await WeaponQualityHelper.hasQuality(mockWeapon, 'accurate');
    const hasScatter = await WeaponQualityHelper.hasQuality(mockWeapon, 'scatter');

    // Check batch call
    const batch = await WeaponQualityHelper.checkMultipleQualities(mockWeapon, [
      'accurate', 'scatter'
    ]);

    expect(batch.accurate).toBe(hasAccurate); // true
    expect(batch.scatter).toBe(hasScatter);   // false
  });
});
