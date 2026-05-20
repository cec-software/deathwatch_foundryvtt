import { jest } from '@jest/globals';
import { PsychicCombatHelper } from '../../src/module/helpers/combat/psychic-combat.mjs';

describe('PsychicCombatHelper - Flamer Workflow (Avenger)', () => {
  let mockActor;
  let mockAvengerPower;
  let mockChatMessage;
  let mockRoll;

  beforeEach(() => {
    // Mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Brother Librarian Marcus',
      type: 'character',
      system: {
        characteristics: {
          wil: { value: 45 }
        },
        psyRating: { value: 4 }
      },
      getActiveTokens: jest.fn().mockReturnValue([])
    };

    // Mock Avenger power with flame quality
    mockAvengerPower = {
      id: 'power-avenger',
      name: 'Avenger',
      type: 'psychic-power',
      system: {
        damageFormula: '1d10+12',
        penetrationFormula: '2*PR',
        damageType: 'Energy',
        range: '30m',
        attachedQualities: [{ id: 'flame' }]
      }
    };

    // Mock ChatMessage
    mockChatMessage = {
      id: 'msg-123'
    };
    global.ChatMessage = {
      create: jest.fn().mockResolvedValue(mockChatMessage),
      getSpeaker: jest.fn().mockReturnValue({
        actor: mockActor.id,
        alias: mockActor.name
      })
    };

    // Mock Roll
    mockRoll = {
      total: 22, // 1d10+12 result
      formula: '1d10+12',
      terms: [],
      toMessage: jest.fn().mockResolvedValue({})
    };
    global.Roll = jest.fn().mockImplementation(() => ({
      evaluate: jest.fn().mockResolvedValue(mockRoll)
    }));

    // Mock game.settings
    global.game = {
      settings: {
        get: jest.fn().mockReturnValue('roll')
      },
      user: {
        targets: {
          first: jest.fn().mockReturnValue(null)
        }
      },
      canvas: {
        tokens: {
          controlled: []
        }
      }
    };

    // Mock foundry.utils for Sanitizer
    global.foundry = {
      utils: {
        escapeHTML: jest.fn((str) => str)
      }
    };
  });

  afterEach(() => {
    delete global.ChatMessage;
    delete global.Roll;
    delete global.game;
    delete global.foundry;
  });

  it('should create flamer-style chat message for Avenger power', async () => {
    const effectivePR = 4;
    const targetNumber = 55;
    const dos = 2;

    await PsychicCombatHelper._rollPsychicDamage(
      mockActor,
      mockAvengerPower,
      effectivePR,
      targetNumber,
      dos
    );

    // Verify chat message was created
    expect(global.ChatMessage.create).toHaveBeenCalledTimes(1);

    const chatArgs = global.ChatMessage.create.mock.calls[0][0];

    // Verify content includes psychic flame header
    expect(chatArgs.content).toContain('🔥 Psychic Flame: Avenger');

    // Verify all required data-* attributes for Flame Attack macro
    expect(chatArgs.content).toContain('data-flamer-damage="22"');
    expect(chatArgs.content).toContain('data-flamer-pen="8"'); // 2*PR = 2*4 = 8
    expect(chatArgs.content).toContain('data-flamer-type="Energy"');
    expect(chatArgs.content).toContain('data-flamer-range="30"');
    expect(chatArgs.content).toContain(`data-actor-id="${mockActor.id}"`);
    expect(chatArgs.content).toContain('data-weapon-name="Avenger"');
    expect(chatArgs.content).toMatch(/data-timestamp="\d+"/);

    // Verify visible content fields
    expect(chatArgs.content).toContain('<strong>Damage:</strong> 22');
    expect(chatArgs.content).toContain('<strong>Penetration:</strong> 8');
    expect(chatArgs.content).toContain('<strong>Damage Type:</strong> Energy');
    expect(chatArgs.content).toContain('<strong>Range:</strong> 30m');
    expect(chatArgs.content).toContain('Run Flame Attack macro for each target in cone.');

    // Verify roll object preserved
    expect(chatArgs.rolls).toEqual([mockRoll]);
  });

  it('should substitute PR in penetration formula', async () => {
    const effectivePR = 5; // Push power level
    const targetNumber = 55;
    const dos = 2;

    await PsychicCombatHelper._rollPsychicDamage(
      mockActor,
      mockAvengerPower,
      effectivePR,
      targetNumber,
      dos
    );

    const chatArgs = global.ChatMessage.create.mock.calls[0][0];

    // 2*PR = 2*5 = 10
    expect(chatArgs.content).toContain('data-flamer-pen="10"');
    expect(chatArgs.content).toContain('<strong>Penetration:</strong> 10');
  });

  it('should extract range from power system range string', async () => {
    // Test various range formats
    mockAvengerPower.system.range = '25 metres';

    await PsychicCombatHelper._rollPsychicDamage(
      mockActor,
      mockAvengerPower,
      4,
      55,
      2
    );

    const chatArgs = global.ChatMessage.create.mock.calls[0][0];
    expect(chatArgs.content).toContain('data-flamer-range="25"');
    expect(chatArgs.content).toContain('<strong>Range:</strong> 25m');
  });

  it('should default to 30m range if range not parseable', async () => {
    mockAvengerPower.system.range = 'Short Range';

    await PsychicCombatHelper._rollPsychicDamage(
      mockActor,
      mockAvengerPower,
      4,
      55,
      2
    );

    const chatArgs = global.ChatMessage.create.mock.calls[0][0];
    expect(chatArgs.content).toContain('data-flamer-range="30"');
  });

  it('should not create flamer message for non-flame psychic powers', async () => {
    // Power without flame quality
    const regularPower = {
      ...mockAvengerPower,
      name: 'Smite',
      system: {
        ...mockAvengerPower.system,
        attachedQualities: []
      }
    };

    // Mock FoundryAdapter for standard psychic damage flow
    const mockFoundryAdapter = await import('../../src/module/helpers/foundry-adapter.mjs');
    const sendRollToChat = jest.fn().mockResolvedValue({});
    const evaluateRoll = jest.fn().mockResolvedValue(mockRoll);
    const getChatSpeaker = jest.fn().mockReturnValue({ actor: mockActor.id });

    mockFoundryAdapter.FoundryAdapter.sendRollToChat = sendRollToChat;
    mockFoundryAdapter.FoundryAdapter.evaluateRoll = evaluateRoll;
    mockFoundryAdapter.FoundryAdapter.getChatSpeaker = getChatSpeaker;

    await PsychicCombatHelper._rollPsychicDamage(
      mockActor,
      regularPower,
      4,
      55,
      2
    );

    // Should use standard FoundryAdapter flow, not ChatMessage.create
    expect(global.ChatMessage.create).not.toHaveBeenCalled();
    expect(sendRollToChat).toHaveBeenCalled();

    // Verify no flamer data in standard flow (check flavor argument)
    const rollArgs = sendRollToChat.mock.calls[0];
    const flavor = rollArgs[1]?.flavor || '';
    expect(flavor).not.toContain('data-flamer-damage');
    expect(flavor).not.toContain('🔥 Psychic Flame');
    expect(flavor).toContain('Smite'); // Should show power name
  });
});
