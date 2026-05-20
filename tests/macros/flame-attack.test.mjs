import { jest } from '@jest/globals';
import { flameAttack, getRecentFlamerDamageRolls } from '../../src/module/macros/flame-attack.mjs';
import * as CombatHelperModule from '../../src/module/helpers/combat/combat.mjs';
import * as FireHelperModule from '../../src/module/helpers/combat/fire-helper.mjs';

const CombatHelper = CombatHelperModule.CombatHelper;
const FireHelper = FireHelperModule.FireHelper;

describe('flameAttack', () => {
  let mockDialogElement;
  let mockDialog;
  let mockTargetActor;
  let mockTargetToken;
  let mockRoll;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock animation modules
    global.game = {
      modules: {
        get: jest.fn((id) => {
          if (id === 'sequencer') return { active: false };
          if (id === 'jb2a_patreon') return { active: false };
          if (id === 'JB2A_DnD5e') return { active: false };
          return null;
        })
      },
      user: {
        targets: {
          first: jest.fn(() => mockTargetToken)
        }
      },
      settings: {
        get: jest.fn(() => 'roll')
      },
      messages: {
        contents: []
      },
      actors: {
        get: jest.fn((id) => {
          const mockActors = {
            'actor-gaius': { name: 'Brother Gaius' },
            'actor-marcus': { name: 'Brother Marcus' }
          };
          return mockActors[id] || null;
        })
      }
    };

    global.canvas = {
      tokens: {
        controlled: [],
        get: jest.fn(() => null)
      }
    };

    // Mock DOM elements
    mockDialogElement = {
      querySelector: jest.fn((selector) => {
        const elements = {
          '#flameDamage': { value: '1d10+4' },
          '#flamePen': { value: '4' },
          '#flameDmgType': { value: 'Energy' },
          '#flameRange': { value: '20' },
          '#dodgeMod': { value: '0' }
        };
        return elements[selector] || { value: '' };
      })
    };

    mockDialog = {
      element: mockDialogElement
    };

    mockTargetActor = {
      name: 'Test Target',
      type: 'character',
      system: {
        characteristics: {
          ag: { value: 40 }
        },
        receiveBatchDamage: jest.fn().mockResolvedValue({})
      },
      setCondition: jest.fn().mockResolvedValue({})
    };

    mockTargetToken = {
      actor: mockTargetActor
    };

    mockRoll = {
      total: 50,
      evaluate: jest.fn(function() { return Promise.resolve(this); }),
      toMessage: jest.fn().mockResolvedValue({})
    };

    // Roll must be a proper constructor
    global.Roll = jest.fn(function(formula) {
      const roll = {
        formula,
        total: 50,
        evaluate: jest.fn(function() { return Promise.resolve(this); }),
        toMessage: jest.fn().mockResolvedValue({})
      };
      return roll;
    });
    global.ChatMessage = {
      getSpeaker: jest.fn(() => ({ alias: 'GM', token: null })),
      create: jest.fn().mockResolvedValue({})
    };
    global.ui = {
      notifications: {
        warn: jest.fn()
      }
    };
    global.foundry = {
      applications: {
        api: {
          DialogV2: {
            wait: jest.fn()
          }
        }
      }
    };

    // Mock helper functions
    CombatHelper.determineHitLocation = jest.fn(() => 'Body');
    CombatHelper.applyDamage = jest.fn().mockResolvedValue({});
    FireHelper.resolveDodgeFlameTest = jest.fn(() => ({ success: false, dos: -2 }));
    FireHelper.buildDodgeFlameFlavor = jest.fn(() => '<div>Dodge Failed</div>');
    FireHelper.resolveCatchFireTest = jest.fn(() => ({ success: false }));
    FireHelper.buildCatchFireFlavor = jest.fn(() => '<div>Caught Fire</div>');
  });

  describe('dialog initialization', () => {
    it('opens dialog with flame attack options', async () => {
      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      expect(waitMock).toHaveBeenCalledWith(
        expect.objectContaining({
          window: { title: '🔥 Flame Attack' },
          content: expect.stringContaining('Damage:'),
          buttons: expect.arrayContaining([
            expect.objectContaining({ label: '🔥 Burn', action: 'burn' }),
            expect.objectContaining({ label: 'Cancel', action: 'cancel' })
          ])
        })
      );
    });

    it('includes damage, penetration, damage type, and range inputs', async () => {
      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      const call = waitMock.mock.calls[0][0];
      expect(call.content).toContain('flameDamage');
      expect(call.content).toContain('flamePen');
      expect(call.content).toContain('flameDmgType');
      expect(call.content).toContain('flameRange');
    });
  });

  describe('input validation', () => {
    it('warns when no damage formula provided', async () => {
      mockDialogElement.querySelector = jest.fn((selector) => {
        if (selector === '#flameDamage') return { value: '' };
        return { value: '0' };
      });

      const waitMock = jest.fn(async (config) => {
        const burnButton = config.buttons.find(b => b.action === 'burn');
        await burnButton.callback({}, {}, mockDialog);
      });
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Enter a damage formula.');
    });

    it('warns when no target selected', async () => {
      global.game.user.targets.first = jest.fn(() => null);

      const waitMock = jest.fn(async (config) => {
        const burnButton = config.buttons.find(b => b.action === 'burn');
        await burnButton.callback({}, {}, mockDialog);
      });
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Target a token before clicking Burn.');
    });

    it('warns when target has no actor', async () => {
      global.game.user.targets.first = jest.fn(() => ({ actor: null }));

      const waitMock = jest.fn(async (config) => {
        const burnButton = config.buttons.find(b => b.action === 'burn');
        await burnButton.callback({}, {}, mockDialog);
      });
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      expect(global.ui.notifications.warn).toHaveBeenCalledWith('Target a token before clicking Burn.');
    });
  });

  describe('horde flame attack workflow', () => {
    it('identifies horde targets correctly', async () => {
      mockTargetActor.type = 'horde';

      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      expect(waitMock).toHaveBeenCalled();
      const config = waitMock.mock.calls[0][0];
      expect(config.window.title).toBe('🔥 Flame Attack');
    });
  });

  describe('individual flame attack workflow', () => {
    it('identifies individual targets correctly', async () => {
      mockTargetActor.type = 'character';

      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      expect(waitMock).toHaveBeenCalled();
      const config = waitMock.mock.calls[0][0];
      expect(config.window.title).toBe('🔥 Flame Attack');
    });
  });

  describe('damage source dropdown', () => {
    it('includes damage source dropdown in dialog', async () => {
      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      const config = waitMock.mock.calls[0][0];
      expect(config.content).toContain('damageSource');
      expect(config.content).toContain('Select Recent Damage Source');
    });

    it('populates dropdown with recent flamer damage rolls', async () => {
      global.game.messages = {
        contents: [
          {
            content: '<div data-flamer-damage="1d10+4" data-flamer-pen="6" data-flamer-type="Energy" data-actor-id="actor-gaius">Flame hit</div>'
          },
          {
            content: '<div data-flamer-damage="1d10+8" data-flamer-pen="10" data-flamer-type="Energy" data-actor-id="actor-marcus">Flame hit</div>'
          }
        ]
      };

      // Mock DOMParser
      global.DOMParser = class DOMParser {
        parseFromString(html, mimeType) {
          return {
            querySelector: jest.fn((selector) => {
              if (html.includes('data-flamer-damage')) {
                const damageMatch = html.match(/data-flamer-damage="([^"]+)"/);
                const penMatch = html.match(/data-flamer-pen="([^"]+)"/);
                const typeMatch = html.match(/data-flamer-type="([^"]+)"/);
                const actorIdMatch = html.match(/data-actor-id="([^"]+)"/);

                return {
                  dataset: {
                    flamerDamage: damageMatch?.[1] || '',
                    flamerPen: penMatch?.[1] || '',
                    flamerType: typeMatch?.[1] || '',
                    actorId: actorIdMatch?.[1] || ''
                  }
                };
              }
              return null;
            })
          };
        }
      };

      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      const config = waitMock.mock.calls[0][0];
      expect(config.content).toContain('Brother Marcus');
      expect(config.content).toContain('Brother Gaius');
      expect(config.content).toContain('1d10+8');
      expect(config.content).toContain('1d10+4');
    });

    it('pre-fills damage fields with most recent roll', async () => {
      global.game.messages = {
        contents: [
          {
            content: '<div data-flamer-damage="1d10+8" data-flamer-pen="10" data-flamer-type="Energy" data-actor-id="actor-marcus">Flame hit</div>'
          }
        ]
      };

      global.DOMParser = class DOMParser {
        parseFromString(html, mimeType) {
          return {
            querySelector: jest.fn((selector) => {
              if (html.includes('data-flamer-damage')) {
                return {
                  dataset: {
                    flamerDamage: '1d10+8',
                    flamerPen: '10',
                    flamerType: 'Energy',
                    actorId: 'actor-marcus'
                  }
                };
              }
              return null;
            })
          };
        }
      };

      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      const config = waitMock.mock.calls[0][0];
      // Check that default values are set in the HTML
      expect(config.content).toContain('value="1d10+8"');
      expect(config.content).toContain('value="10"');
      expect(config.content).toContain('value="Energy"');
    });

    it('leaves fields empty when no recent rolls found', async () => {
      global.game.messages = {
        contents: []
      };

      const waitMock = jest.fn().mockResolvedValue(null);
      global.foundry.applications.api.DialogV2.wait = waitMock;

      await flameAttack();

      const config = waitMock.mock.calls[0][0];
      // Should have empty default values
      expect(config.content).toContain('value=""');
    });
  });

});

describe('getRecentFlamerDamageRolls', () => {
  beforeEach(() => {
    // Mock game.messages collection and actors
    global.game = {
      messages: {
        contents: []
      },
      actors: {
        get: jest.fn((id) => {
          const mockActors = {
            'actor-gaius': { name: 'Brother Gaius' },
            'actor-marcus': { name: 'Brother Marcus' }
          };
          return mockActors[id] || null;
        })
      }
    };

    // Mock DOMParser
    global.DOMParser = class DOMParser {
      parseFromString(html, mimeType) {
        // Simple mock - return object with querySelector
        return {
          querySelector: jest.fn((selector) => {
            if (html.includes(selector.replace(/[\[\]]/g, ''))) {
              // Extract data attributes from the HTML string
              const match = html.match(/data-flamer-damage="([^"]+)"/);
              const damageMatch = html.match(/data-flamer-damage="([^"]+)"/);
              const penMatch = html.match(/data-flamer-pen="([^"]+)"/);
              const typeMatch = html.match(/data-flamer-type="([^"]+)"/);
              const actorIdMatch = html.match(/data-actor-id="([^"]+)"/);

              if (match) {
                return {
                  dataset: {
                    flamerDamage: damageMatch?.[1] || '',
                    flamerPen: penMatch?.[1] || '',
                    flamerType: typeMatch?.[1] || '',
                    actorId: actorIdMatch?.[1] || ''
                  }
                };
              }
            }
            return null;
          })
        };
      }
    };
  });

  it('returns empty array when no flamer damage messages found', () => {
    global.game.messages.contents = [
      { content: '<div>Regular message</div>' },
      { content: '<div>Another message</div>' }
    ];

    const result = getRecentFlamerDamageRolls();

    expect(result).toEqual([]);
  });

  it('parses flamer damage messages correctly', () => {
    global.game.messages.contents = [
      {
        content: '<div data-flamer-damage="1d10+4" data-flamer-pen="6" data-flamer-type="Energy" data-actor-id="actor-gaius">Flame hit</div>'
      },
      {
        content: '<div data-flamer-damage="1d10+8" data-flamer-pen="10" data-flamer-type="Energy" data-actor-id="actor-marcus">Flame hit</div>'
      }
    ];

    const result = getRecentFlamerDamageRolls();

    expect(result).toEqual([
      { damage: '1d10+8', pen: 10, damageType: 'Energy', attackerName: 'Brother Marcus' },
      { damage: '1d10+4', pen: 6, damageType: 'Energy', attackerName: 'Brother Gaius' }
    ]);
  });

  it('limits results to most recent 20 messages', () => {
    // Add mock actors for this test
    const mockActors = {};
    for (let i = 0; i < 30; i++) {
      mockActors[`actor-${i}`] = { name: `Brother ${i}` };
    }
    global.game.actors.get = jest.fn((id) => mockActors[id] || null);

    const messages = [];
    for (let i = 0; i < 30; i++) {
      messages.push({
        content: `<div data-flamer-damage="1d10+${i}" data-flamer-pen="${i}" data-flamer-type="Energy" data-actor-id="actor-${i}">Flame ${i}</div>`
      });
    }
    global.game.messages.contents = messages;

    const result = getRecentFlamerDamageRolls();

    // Should only get last 20
    expect(result.length).toBe(20);
    // Most recent should be last message (index 29), reverse order
    expect(result[0].damage).toBe('1d10+29');
    expect(result[19].damage).toBe('1d10+10');
  });
});
