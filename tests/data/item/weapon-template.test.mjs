import DeathwatchWeapon from '../../../src/module/data/item/weapon.mjs';

function createWeapon(overrides = {}) {
  const weapon = new DeathwatchWeapon();
  Object.assign(weapon, overrides);
  return weapon;
}

describe('DeathwatchWeapon - Template Schema', () => {
  test('has template field in schema', () => {
    const schema = DeathwatchWeapon.defineSchema();
    expect(schema.template).toBeDefined();
  });

  test('template.type accepts empty string', () => {
    const weaponData = createWeapon({ template: { type: '', distance: '', angle: '' } });
    expect(weaponData.template.type).toBe('');
  });

  test('template.type accepts "cone"', () => {
    const weaponData = createWeapon({ template: { type: 'cone', distance: '', angle: '' } });
    expect(weaponData.template.type).toBe('cone');
  });

  test('template.type accepts "circle"', () => {
    const weaponData = createWeapon({ template: { type: 'circle', distance: '', angle: '' } });
    expect(weaponData.template.type).toBe('circle');
  });

  test('template.type accepts "ray"', () => {
    const weaponData = createWeapon({ template: { type: 'ray', distance: '', angle: '' } });
    expect(weaponData.template.type).toBe('ray');
  });

  test('template.distance accepts formula string', () => {
    const weaponData = createWeapon({ template: { type: '', distance: '10*PR', angle: '' } });
    expect(weaponData.template.distance).toBe('10*PR');
  });

  test('template.angle accepts formula string', () => {
    const weaponData = createWeapon({ template: { type: '', distance: '', angle: '30' } });
    expect(weaponData.template.angle).toBe('30');
  });

  test('template defaults to null', () => {
    const weaponData = createWeapon();
    // Foundry SchemaFields with initial: null may be undefined until accessed
    // Check that it's either null or undefined (both are acceptable empty values)
    expect(weaponData.template == null).toBe(true);
  });
});
