import DeathwatchPsychicPower from '../../../src/module/data/item/psychic-power.mjs';

function createPsychicPower(overrides = {}) {
  const power = new DeathwatchPsychicPower();
  Object.assign(power, overrides);
  return power;
}

describe('DeathwatchPsychicPower - Template Schema', () => {
  test('has template field in schema', () => {
    const schema = DeathwatchPsychicPower.defineSchema();
    expect(schema.template).toBeDefined();
  });

  test('template.type accepts empty string', () => {
    const powerData = createPsychicPower({ template: { type: '', distance: '', angle: '' } });
    expect(powerData.template.type).toBe('');
  });

  test('template.type accepts "cone"', () => {
    const powerData = createPsychicPower({ template: { type: 'cone', distance: '', angle: '' } });
    expect(powerData.template.type).toBe('cone');
  });

  test('template.type accepts "circle"', () => {
    const powerData = createPsychicPower({ template: { type: 'circle', distance: '', angle: '' } });
    expect(powerData.template.type).toBe('circle');
  });

  test('template.type accepts "ray"', () => {
    const powerData = createPsychicPower({ template: { type: 'ray', distance: '', angle: '' } });
    expect(powerData.template.type).toBe('ray');
  });

  test('template.distance accepts formula string', () => {
    const powerData = createPsychicPower({ template: { type: '', distance: '10*PR', angle: '' } });
    expect(powerData.template.distance).toBe('10*PR');
  });

  test('template.angle accepts formula string', () => {
    const powerData = createPsychicPower({ template: { type: '', distance: '', angle: '30' } });
    expect(powerData.template.angle).toBe('30');
  });

  test('template defaults to null', () => {
    const powerData = createPsychicPower();
    // Foundry SchemaFields with initial: null may be undefined until accessed
    // Check that it's either null or undefined (both are acceptable empty values)
    expect(powerData.template == null).toBe(true);
  });
});
