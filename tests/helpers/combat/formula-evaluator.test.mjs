import { getCharacteristicValue, evaluateFormula, validateFormula } from '../../../src/module/helpers/combat/formula-evaluator.mjs';

describe('Formula Evaluator - Characteristic Mapping', () => {
  test('maps PR to actor.system.characteristics.pr.value', () => {
    const mockActor = {
      system: {
        characteristics: {
          pr: { value: 5 }
        }
      }
    };

    expect(getCharacteristicValue('PR', mockActor)).toBe(5);
  });

  test('maps AG to actor.system.characteristics.ag.value', () => {
    const mockActor = {
      system: {
        characteristics: {
          ag: { value: 40 }
        }
      }
    };

    expect(getCharacteristicValue('AG', mockActor)).toBe(40);
  });

  test('returns undefined for unknown characteristic', () => {
    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    expect(getCharacteristicValue('XYZ', mockActor)).toBeUndefined();
  });

  test('returns undefined when characteristic not present', () => {
    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    expect(getCharacteristicValue('PR', mockActor)).toBeUndefined();
  });
});

describe('Formula Evaluator - Literal Numbers', () => {
  test('evaluates literal number "30" as 30', () => {
    const mockActor = { system: { characteristics: {} } };
    expect(evaluateFormula('30', mockActor)).toBe(30);
  });

  test('evaluates literal number "0" as 0', () => {
    const mockActor = { system: { characteristics: {} } };
    expect(evaluateFormula('0', mockActor)).toBe(0);
  });

  test('evaluates literal decimal "12.5" as 12.5', () => {
    const mockActor = { system: { characteristics: {} } };
    expect(evaluateFormula('12.5', mockActor)).toBe(12.5);
  });

  test('throws error for invalid literal "abc"', () => {
    const mockActor = { system: { characteristics: {} } };
    expect(() => evaluateFormula('abc', mockActor)).toThrow('Invalid formula');
  });
});

describe('Formula Evaluator - Characteristic Formulas', () => {
  test('evaluates "10*PR" with PR=5 as 50', () => {
    const mockActor = {
      system: {
        characteristics: {
          pr: { value: 5 }
        }
      }
    };
    expect(evaluateFormula('10*PR', mockActor)).toBe(50);
  });

  test('evaluates "2*PR" with PR=6 as 12', () => {
    const mockActor = {
      system: {
        characteristics: {
          pr: { value: 6 }
        }
      }
    };
    expect(evaluateFormula('2*PR', mockActor)).toBe(12);
  });

  test('evaluates "PR+AG" with PR=5, AG=40 as 45', () => {
    const mockActor = {
      system: {
        characteristics: {
          pr: { value: 5 },
          ag: { value: 40 }
        }
      }
    };
    expect(evaluateFormula('PR+AG', mockActor)).toBe(45);
  });

  test('throws error for missing characteristic in formula', () => {
    const mockActor = {
      system: {
        characteristics: {}
      }
    };
    expect(() => evaluateFormula('10*PR', mockActor)).toThrow('has no Psy Rating (PR)');
  });

  test('throws error for unknown characteristic', () => {
    const mockActor = {
      system: {
        characteristics: {}
      }
    };
    expect(() => evaluateFormula('10*XYZ', mockActor)).toThrow('unknown characteristic');
  });
});

describe('Formula Evaluator - Validation', () => {
  test('validates literal number "30" as true', () => {
    expect(validateFormula('30')).toBe(true);
  });

  test('validates characteristic formula "10*PR" as true', () => {
    expect(validateFormula('10*PR')).toBe(true);
  });

  test('validates complex formula "PR+AG" as true', () => {
    expect(validateFormula('PR+AG')).toBe(true);
  });

  test('validates empty string as false', () => {
    expect(validateFormula('')).toBe(false);
  });

  test('validates null as false', () => {
    expect(validateFormula(null)).toBe(false);
  });

  test('validates malicious code as false', () => {
    expect(validateFormula('console.log("hack")')).toBe(false);
  });

  test('validates dangerous patterns as false', () => {
    expect(validateFormula('process.exit()')).toBe(false);
  });
});
