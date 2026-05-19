import { jest } from '@jest/globals';
import { templateAttack, evaluateTemplateConfig, identifyTargets, showPrePlacementDialog, placeTemplate, rollDamage, showResolutionDialog, buildPCSection, buildNPCSection, buildHordeSection } from '../../src/module/macros/template-attack.mjs';

describe('Template Attack - Entry Point', () => {
  test('templateAttack is a function', () => {
    expect(typeof templateAttack).toBe('function');
  });

  test('templateAttack returns a promise', () => {
    const mockItem = {
      system: {
        template: { type: 'cone', distance: '30', angle: '30' }
      }
    };
    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    const result = templateAttack(mockItem, mockActor);
    expect(result).toBeInstanceOf(Promise);
  });
});

describe('Template Attack - Config Evaluation', () => {
  test('evaluateTemplateConfig resolves literal formulas', () => {
    const item = {
      system: {
        template: { type: 'cone', distance: '30', angle: '45' }
      }
    };
    const actor = {
      system: {
        characteristics: {}
      }
    };

    const config = evaluateTemplateConfig(item, actor);

    expect(config.type).toBe('cone');
    expect(config.distance).toBe(30);
    expect(config.angle).toBe(45);
  });

  test('evaluateTemplateConfig resolves characteristic formulas', () => {
    const item = {
      system: {
        template: { type: 'cone', distance: '10*PR', angle: '30' }
      }
    };
    const actor = {
      system: {
        characteristics: {
          pr: { value: 5 }
        }
      }
    };

    const config = evaluateTemplateConfig(item, actor);

    expect(config.distance).toBe(50);
  });

  test('evaluateTemplateConfig throws error for missing characteristic', () => {
    const item = {
      system: {
        template: { type: 'cone', distance: '10*PR', angle: '30' }
      }
    };
    const actor = {
      system: {
        characteristics: {}
      }
    };

    expect(() => evaluateTemplateConfig(item, actor)).toThrow('Psy Rating');
  });
});

describe('Template Attack - Target Identification', () => {
  test('identifyTargets categorizes PC tokens', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: {
              type: 'character',
              hasPlayerOwner: true
            }
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(1);
    expect(targets.npcs).toHaveLength(0);
    expect(targets.hordes).toHaveLength(0);
  });

  test('identifyTargets categorizes NPC tokens', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: {
              type: 'npc',
              hasPlayerOwner: false
            }
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(0);
    expect(targets.npcs).toHaveLength(1);
    expect(targets.hordes).toHaveLength(0);
  });

  test('identifyTargets excludes tokens outside template', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => false)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: {
              type: 'character',
              hasPlayerOwner: true
            }
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(0);
    expect(targets.npcs).toHaveLength(0);
    expect(targets.hordes).toHaveLength(0);
  });

  test('identifyTargets handles tokens without actors', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: null
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(0);
    expect(targets.npcs).toHaveLength(0);
    expect(targets.hordes).toHaveLength(0);
  });

  test('identifyTargets handles multiple mixed tokens', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: {
              type: 'character',
              hasPlayerOwner: true
            }
          },
          {
            center: { x: 150, y: 150 },
            actor: {
              type: 'character',
              hasPlayerOwner: true
            }
          },
          {
            center: { x: 200, y: 200 },
            actor: {
              type: 'npc',
              hasPlayerOwner: false
            }
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(2);
    expect(targets.npcs).toHaveLength(1);
    expect(targets.hordes).toHaveLength(0);
  });

  test('identifyTargets handles template without shape', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: null
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: {
              type: 'character',
              hasPlayerOwner: true
            }
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(0);
    expect(targets.npcs).toHaveLength(0);
    expect(targets.hordes).toHaveLength(0);
  });

  test('identifyTargets handles NPC with different type strings', () => {
    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            center: { x: 100, y: 100 },
            actor: {
              type: 'enemy',
              hasPlayerOwner: false
            }
          }
        ]
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.pcs).toHaveLength(0);
    expect(targets.npcs).toHaveLength(1);
    expect(targets.hordes).toHaveLength(0);
  });
});

describe('Template Attack - Horde Deduplication', () => {
  test('identifyTargets deduplicates horde tokens by actor', () => {
    const mockHordeActor = {
      type: 'horde',
      hasPlayerOwner: false,
      id: 'horde-actor-1'
    };

    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            actor: mockHordeActor,
            center: { x: 100, y: 100 },
            id: 'token-1'
          },
          {
            actor: mockHordeActor,
            center: { x: 150, y: 100 },
            id: 'token-2'
          },
          {
            actor: mockHordeActor,
            center: { x: 200, y: 100 },
            id: 'token-3'
          }
        ]
      },
      grid: {
        distance: 1.5
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.hordes).toHaveLength(1);
    expect(targets.hordes[0].actor.id).toBe('horde-actor-1');
    expect(targets.hordes[0].tokens).toHaveLength(3);
  });

  test('identifyTargets calculates closest token distance', () => {
    const mockHordeActor = {
      type: 'horde',
      hasPlayerOwner: false,
      id: 'horde-actor-1'
    };

    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            actor: mockHordeActor,
            center: { x: 30, y: 40 },  // Distance = 50 units
            id: 'token-1'
          },
          {
            actor: mockHordeActor,
            center: { x: 60, y: 80 },  // Distance = 100 units
            id: 'token-2'
          }
        ]
      },
      grid: {
        distance: 1.5  // 1.5 meters per grid unit
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.hordes[0].distance).toBe(75); // 50 units * 1.5 m/unit
  });

  test('identifyTargets handles multiple different horde actors', () => {
    const mockHordeActor1 = {
      type: 'horde',
      hasPlayerOwner: false,
      id: 'horde-actor-1'
    };

    const mockHordeActor2 = {
      type: 'horde',
      hasPlayerOwner: false,
      id: 'horde-actor-2'
    };

    const mockTemplate = {
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true)
        }
      }
    };

    global.canvas = {
      tokens: {
        placeables: [
          {
            actor: mockHordeActor1,
            center: { x: 100, y: 100 },
            id: 'token-1'
          },
          {
            actor: mockHordeActor1,
            center: { x: 150, y: 100 },
            id: 'token-2'
          },
          {
            actor: mockHordeActor2,
            center: { x: 200, y: 100 },
            id: 'token-3'
          }
        ]
      },
      grid: {
        distance: 1.5
      }
    };

    const targets = identifyTargets(mockTemplate);

    expect(targets.hordes).toHaveLength(2);
  });
});

describe('Template Attack - Pre-Placement Dialog', () => {
  test('showPrePlacementDialog returns config with user values', async () => {
    // Mock DialogV2.wait
    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValue({
              distance: 50,
              angle: 60
            })
          }
        }
      }
    };

    const config = { type: 'cone', distance: 30, angle: 45 };
    const result = await showPrePlacementDialog(config);

    expect(result.distance).toBe(50);
    expect(result.angle).toBe(60);
  });

  test('showPrePlacementDialog returns null on cancel', async () => {
    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValue(null)
          }
        }
      }
    };

    const config = { type: 'cone', distance: 30, angle: 45 };
    const result = await showPrePlacementDialog(config);

    expect(result).toBeNull();
  });
});

describe('Template Attack - Template Placement', () => {
  test('placeTemplate creates MeasuredTemplate document', async () => {
    const mockTemplate = { id: 'template-123', x: 100, y: 100 };

    global.canvas = {
      scene: { id: 'scene-1' }
    };

    global.game = {
      user: { id: 'user-1', color: '#FF0000' },
      combat: {
        current: { turn: 1, round: 2 }
      }
    };

    const mockCreate = jest.fn().mockResolvedValue(mockTemplate);
    global.MeasuredTemplateDocument = {
      create: mockCreate
    };

    const config = { type: 'cone', distance: 30, angle: 45 };
    const result = await placeTemplate(config);

    expect(mockCreate).toHaveBeenCalled();
    expect(result).toBe(mockTemplate);
  });

  test('placeTemplate returns null on cancel', async () => {
    global.canvas = { scene: { id: 'scene-1' } };
    global.game = { user: { id: 'user-1', color: '#FF0000' } };
    global.MeasuredTemplateDocument = {
      create: jest.fn().mockResolvedValue(null)
    };

    const config = { type: 'cone', distance: 30, angle: 45 };
    const result = await placeTemplate(config);

    expect(result).toBeNull();
  });

  test('placeTemplate returns null and shows error on exception', async () => {
    global.canvas = { scene: { id: 'scene-1' } };
    global.game = { user: { id: 'user-1' } };
    global.ui = {
      notifications: {
        error: jest.fn(),
        info: jest.fn()
      }
    };

    const testError = new Error('Creation failed');
    global.MeasuredTemplateDocument = {
      create: jest.fn().mockRejectedValue(testError)
    };

    const config = { type: 'cone', distance: 30, angle: 45 };
    const result = await placeTemplate(config);

    expect(result).toBeNull();
    expect(global.ui.notifications.error).toHaveBeenCalledWith('Template placement failed: Creation failed');
  });
});

describe('Template Attack - Damage Roll', () => {
  test('rollDamage evaluates damage formula', async () => {
    const mockRoll = {
      total: 23,
      evaluate: jest.fn().mockResolvedValue({ total: 23 })
    };

    global.Roll = jest.fn().mockReturnValue(mockRoll);

    const item = {
      system: {
        damageFormula: '1d10+12',
        penetrationFormula: '6',
        damageType: 'Energy'
      }
    };
    const actor = {
      system: { characteristics: {} }
    };

    const result = await rollDamage(item, actor);

    expect(result.damage).toBe(23);
    expect(result.penetration).toBe(6);
    expect(result.damageType).toBe('Energy');
  });

  test('rollDamage evaluates penetration formula with PR', async () => {
    const mockRoll = {
      total: 15,
      evaluate: jest.fn().mockResolvedValue({ total: 15 })
    };

    global.Roll = jest.fn().mockReturnValue(mockRoll);

    const item = {
      system: {
        damageFormula: '1d10+4',
        penetrationFormula: '2*PR',
        damageType: 'Energy'
      }
    };
    const actor = {
      system: {
        characteristics: {
          pr: { value: 5 }
        }
      }
    };

    const result = await rollDamage(item, actor);

    expect(result.penetration).toBe(10); // 2 * 5
  });
});

describe('Template Attack - Resolution Dialog', () => {
  test('showResolutionDialog creates dialog with damage display', async () => {
    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValue('close')
          }
        }
      }
    };

    const targets = { pcs: [], npcs: [], hordes: [] };
    const damage = 23;
    const penetration = 6;
    const config = { damageType: 'Energy' };

    await showResolutionDialog(targets, damage, penetration, config);

    expect(global.foundry.applications.api.DialogV2.wait).toHaveBeenCalled();
  });
});

describe('Template Attack - PC Section', () => {
  test('buildPCSection displays PC names and AG values', () => {
    const pcs = [
      {
        name: 'Aldric Thorne',
        actor: {
          system: {
            characteristics: {
              ag: { value: 45 }
            }
          }
        }
      },
      {
        name: 'Sister Verity',
        actor: {
          system: {
            characteristics: {
              ag: { value: 38 }
            }
          }
        }
      }
    ];

    const html = buildPCSection(pcs, 23, 6, 'Energy');

    expect(html).toContain('Aldric Thorne');
    expect(html).toContain('AG: 45');
    expect(html).toContain('Sister Verity');
    expect(html).toContain('AG: 38');
    expect(html).toContain('Damage if failed: 23 (Pen 6, Energy)');
  });

  test('buildPCSection handles empty PC list', () => {
    const html = buildPCSection([], 23, 6, 'Energy');
    expect(html).toBe('');
  });
});

describe('Template Attack - NPC Section', () => {
  test('buildNPCSection displays NPC names and AG values', () => {
    const npcs = [
      {
        id: 'token-1',
        name: 'Ork Boy',
        actor: {
          system: {
            characteristics: {
              ag: { value: 30 }
            }
          }
        }
      }
    ];

    const html = buildNPCSection(npcs);

    expect(html).toContain('Ork Boy');
    expect(html).toContain('<td>30</td>');
    expect(html).toContain('Roll');
    expect(html).toContain('data-token-id="token-1"');
  });

  test('buildNPCSection handles empty NPC list', () => {
    const html = buildNPCSection([]);
    expect(html).toBe('');
  });
});

describe('Template Attack - Horde Section', () => {
  test('buildHordeSection displays horde with token count and hit calculation', () => {
    const hordes = [
      {
        actor: {
          id: 'horde-1',
          name: 'Ork Mob'
        },
        tokens: [{}, {}, {}], // 3 tokens
        distance: 30
      }
    ];

    const html = buildHordeSection(hordes);

    expect(html).toContain('Ork Mob');
    expect(html).toContain('Range: 30m');
    expect(html).toContain('[3 tokens affected]');
    expect(html).toContain('Roll Damage');
  });

  test('buildHordeSection handles empty horde list', () => {
    const html = buildHordeSection([]);
    expect(html).toBe('');
  });
});

describe('Template Attack - Full Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('templateAttack orchestrates full workflow', async () => {
    // Mock all dependencies
    const mockItem = {
      system: {
        template: { type: 'cone', distance: '30', angle: '45' },
        damageFormula: '1d10+12',
        penetrationFormula: '6',
        damageType: 'Energy'
      }
    };

    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    const mockToken = {
      center: { x: 100, y: 100 },
      actor: {
        type: 'enemy',
        hasPlayerOwner: false,
        system: {
          characteristics: {
            ag: { value: 30 }
          }
        }
      },
      id: 'token-1',
      name: 'Ork Boy'
    };

    const mockTemplate = {
      id: 'template-1',
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => true) // Token is within bounds
        }
      }
    };

    // Mock all globals
    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn()
              .mockResolvedValueOnce({ distance: 30, angle: 45 }) // Pre-placement
              .mockResolvedValueOnce('close') // Resolution dialog
          }
        }
      }
    };

    global.MeasuredTemplateDocument = {
      create: jest.fn().mockResolvedValue(mockTemplate)
    };

    global.canvas = {
      scene: { id: 'scene-1' },
      tokens: { placeables: [mockToken] },
      grid: { distance: 1.5 },
      templates: { placeables: [] }
    };

    global.game = {
      user: { id: 'user-1', color: '#ffffff' },
      combat: null
    };

    global.Roll = jest.fn().mockImplementation(() => ({
      evaluate: jest.fn().mockResolvedValue({ total: 23 })
    }));

    global.ui = {
      notifications: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    // Execute full workflow
    await templateAttack(mockItem, mockActor);

    // Verify workflow steps executed
    expect(global.foundry.applications.api.DialogV2.wait).toHaveBeenCalledTimes(2);
    expect(global.MeasuredTemplateDocument.create).toHaveBeenCalled();
  });

  test('templateAttack handles cancellation at pre-placement', async () => {
    const mockItem = {
      system: {
        template: { type: 'cone', distance: '30', angle: '45' },
        damageFormula: '1d10+12',
        penetrationFormula: '6',
        damageType: 'Energy'
      }
    };

    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValueOnce(null) // User cancelled
          }
        }
      }
    };

    global.ui = {
      notifications: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    await templateAttack(mockItem, mockActor);

    expect(global.ui.notifications.info).toHaveBeenCalledWith('Template attack cancelled');
  });

  test('templateAttack handles template placement cancellation', async () => {
    const mockItem = {
      system: {
        template: { type: 'cone', distance: '30', angle: '45' },
        damageFormula: '1d10+12',
        penetrationFormula: '6',
        damageType: 'Energy'
      }
    };

    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValueOnce({ distance: 30, angle: 45 })
          }
        }
      }
    };

    global.MeasuredTemplateDocument = {
      create: jest.fn().mockResolvedValue(null) // Placement cancelled
    };

    global.canvas = {
      scene: { id: 'scene-1' }
    };

    global.game = {
      user: { id: 'user-1', color: '#ffffff' },
      combat: null
    };

    global.ui = {
      notifications: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    await templateAttack(mockItem, mockActor);

    // Should return early without showing resolution dialog
    expect(global.foundry.applications.api.DialogV2.wait).toHaveBeenCalledTimes(1);
  });

  test('templateAttack warns when no targets found', async () => {
    const mockItem = {
      system: {
        template: { type: 'cone', distance: '30', angle: '45' },
        damageFormula: '1d10+12',
        penetrationFormula: '6',
        damageType: 'Energy'
      }
    };

    const mockActor = {
      system: {
        characteristics: {}
      }
    };

    const mockTemplate = {
      id: 'template-1',
      x: 0,
      y: 0,
      object: {
        shape: {
          contains: jest.fn(() => false) // No targets
        }
      }
    };

    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn().mockResolvedValueOnce({ distance: 30, angle: 45 })
          }
        }
      }
    };

    global.MeasuredTemplateDocument = {
      create: jest.fn().mockResolvedValue(mockTemplate)
    };

    global.canvas = {
      scene: { id: 'scene-1' },
      tokens: { placeables: [] },
      grid: { distance: 1.5 },
      templates: { placeables: [] }
    };

    global.game = {
      user: { id: 'user-1', color: '#ffffff' },
      combat: null
    };

    global.Roll = jest.fn().mockImplementation(() => ({
      evaluate: jest.fn().mockResolvedValue({ total: 23 })
    }));

    global.ui = {
      notifications: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    await templateAttack(mockItem, mockActor);

    expect(global.ui.notifications.warn).toHaveBeenCalledWith('No targets found in template area');
  });
});
