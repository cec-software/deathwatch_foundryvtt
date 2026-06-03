import { jest } from '@jest/globals';
import { AnimationHook } from '../../src/module/hooks/animation-hook.mjs';

describe('AnimationHook', () => {
  let mockMessage;
  let mockSourceToken;
  let mockTargetToken;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourceToken = { id: 'source1', x: 100, y: 100 };
    mockTargetToken = { id: 'target1', x: 200, y: 200 };

    // Mock DOMParser
    global.DOMParser = class {
      parseFromString(content) {
        return {
          querySelector: (selector) => {
            if (selector === '.dw-attack-roll' && content.includes('dw-attack-roll')) {
              // Extract data attributes from content
              const actorIdMatch = content.match(/data-actor-id="([^"]*)"/);
              const itemIdMatch = content.match(/data-item-id="([^"]*)"/);
              const roundsFiredMatch = content.match(/data-rounds-fired="([^"]*)"/);
              const animationKeyMatch = content.match(/data-animation-key="([^"]*)"/);
              const attackTypeMatch = content.match(/data-attack-type="([^"]*)"/);
              const sourceTokenIdMatch = content.match(/data-source-token-id="([^"]*)"/);
              const targetTokenIdMatch = content.match(/data-target-token-id="([^"]*)"/);

              if (actorIdMatch) {
                return {
                  dataset: {
                    actorId: actorIdMatch[1],
                    itemId: itemIdMatch ? itemIdMatch[1] : '',
                    roundsFired: roundsFiredMatch ? roundsFiredMatch[1] : '1',
                    animationKey: animationKeyMatch ? animationKeyMatch[1] : '',
                    attackType: attackTypeMatch ? attackTypeMatch[1] : '',
                    sourceTokenId: sourceTokenIdMatch ? sourceTokenIdMatch[1] : '',
                    targetTokenId: targetTokenIdMatch ? targetTokenIdMatch[1] : ''
                  }
                };
              }
            }
            return null;
          }
        };
      }
    };

    mockMessage = {
      content: `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-item-uuid="Actor.actor123.Item.item456"
        data-rounds-fired="3"
        data-fire-mode="semi"
        data-animation-key=""
        data-damage-type="Explosive"
        data-weapon-class="basic">
        <div class="attack-flavor">Test Attack</div>
      </div>`,
      rolls: [{ total: 42 }]
    };

    global.game = {
      modules: {
        get: jest.fn()
      },
      actors: {
        get: jest.fn()
      },
      user: {
        targets: {
          first: jest.fn()
        }
      }
    };

    global.canvas = {
      tokens: {
        get: jest.fn()
      }
    };

    global.Sequence = jest.fn();
  });

  describe('register', () => {
    it('registers createChatMessage hook', () => {
      const mockHooksOn = jest.fn();
      global.Hooks = { on: mockHooksOn };

      AnimationHook.register();

      expect(mockHooksOn).toHaveBeenCalledWith(
        'createChatMessage',
        expect.any(Function)
      );
    });
  });

  describe('onCreateChatMessage', () => {
    it('does nothing if animation libraries not available', async () => {
      global.game.modules.get = jest.fn(() => ({ active: false }));

      await AnimationHook.onCreateChatMessage(mockMessage);

      // Should exit early, no token lookups
      expect(global.canvas.tokens.get).not.toHaveBeenCalled();
    });

    it('does nothing if message has no dw-attack-roll div', async () => {
      global.game.modules.get = jest.fn(() => ({ active: true }));
      mockMessage.content = '<div>Regular message</div>';

      await AnimationHook.onCreateChatMessage(mockMessage);

      expect(global.canvas.tokens.get).not.toHaveBeenCalled();
    });

    it('does nothing if no source token found', async () => {
      global.game.modules.get = jest.fn(() => ({ active: true }));
      global.game.actors.get = jest.fn(() => ({
        getActiveTokens: jest.fn(() => [])
      }));

      await AnimationHook.onCreateChatMessage(mockMessage);

      expect(global.Sequence).not.toHaveBeenCalled();
    });

    it('does nothing if no target token selected', async () => {
      global.game.modules.get = jest.fn(() => ({ active: true }));
      global.game.actors.get = jest.fn(() => ({
        getActiveTokens: jest.fn(() => [mockSourceToken])
      }));
      global.game.user.targets.first = jest.fn(() => null);

      await AnimationHook.onCreateChatMessage(mockMessage);

      expect(global.Sequence).not.toHaveBeenCalled();
    });

    it('extracts metadata and plays animation', async () => {
      mockMessage.content = `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-attack-type="ranged"
        data-rounds-fired="3"
        data-source-token-id="source1"
        data-target-token-id="target1">
      </div>`;

      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const mockActor = {
        getActiveTokens: jest.fn(() => [mockSourceToken]),
        items: {
          get: jest.fn(() => ({
            name: 'Bolter',
            system: { dmgType: 'Explosive' }
          }))
        }
      };

      global.game.actors.get = jest.fn(() => mockActor);
      global.canvas.tokens.get = jest.fn((id) => {
        if (id === 'source1') return mockSourceToken;
        if (id === 'target1') return mockTargetToken;
        return null;
      });

      const mockSequence = {
        effect: jest.fn().mockReturnValue({
          file: jest.fn().mockReturnThis(),
          atLocation: jest.fn().mockReturnThis(),
          stretchTo: jest.fn().mockReturnThis(),
          repeats: jest.fn().mockReturnValue(null)
        }),
        play: jest.fn()
      };

      global.Sequence = jest.fn(() => mockSequence);

      await AnimationHook.onCreateChatMessage(mockMessage);

      expect(global.game.actors.get).toHaveBeenCalledWith('actor123');
      expect(mockActor.items.get).toHaveBeenCalledWith('item456');
      expect(mockSequence.play).toHaveBeenCalled();
    });

    it('uses animationKey when provided', async () => {
      mockMessage.content = `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-attack-type="ranged"
        data-animation-key="plasma"
        data-damage-type="Explosive"
        data-source-token-id="source1"
        data-target-token-id="target1">
      </div>`;

      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const mockActor = {
        getActiveTokens: jest.fn(() => [mockSourceToken]),
        items: {
          get: jest.fn(() => ({
            name: 'Bolter',
            system: { dmgType: 'Explosive' }
          }))
        }
      };

      global.game.actors.get = jest.fn(() => mockActor);
      global.canvas.tokens.get = jest.fn((id) => {
        if (id === 'source1') return mockSourceToken;
        if (id === 'target1') return mockTargetToken;
        return null;
      });

      const mockEffect = {
        file: jest.fn().mockReturnThis(),
        atLocation: jest.fn().mockReturnThis(),
        stretchTo: jest.fn().mockReturnThis(),
        repeats: jest.fn().mockReturnValue(null)
      };

      const mockSequence = {
        effect: jest.fn(() => mockEffect),
        play: jest.fn()
      };

      global.Sequence = jest.fn(() => mockSequence);

      await AnimationHook.onCreateChatMessage(mockMessage);

      // Plasma config has specific file
      expect(mockEffect.file).toHaveBeenCalledWith('jb2a.lasershot.blue');
    });

    it('uses source token ID from message data instead of actor.getActiveTokens()', async () => {
      // Setup: Message contains explicit source-token-id
      mockMessage.content = `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-attack-type="ranged"
        data-source-token-id="source-token-999"
        data-target-token-id="target-token-888"
        data-rounds-fired="1">
      </div>`;

      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const mockActor = {
        items: {
          get: jest.fn(() => ({
            name: 'Bolter',
            system: { dmgType: 'Explosive' }
          }))
        }
      };

      global.game.actors.get = jest.fn(() => mockActor);

      // Mock canvas.tokens.get to return specific tokens by ID
      const mockSourceTokenFromCanvas = { id: 'source-token-999', x: 100, y: 100 };
      const mockTargetTokenFromCanvas = { id: 'target-token-888', x: 200, y: 200 };

      global.canvas.tokens.get = jest.fn((tokenId) => {
        if (tokenId === 'source-token-999') return mockSourceTokenFromCanvas;
        if (tokenId === 'target-token-888') return mockTargetTokenFromCanvas;
        return null;
      });

      const mockEffect = {
        file: jest.fn().mockReturnThis(),
        atLocation: jest.fn().mockReturnThis(),
        stretchTo: jest.fn().mockReturnThis(),
        repeats: jest.fn().mockReturnValue(null)
      };

      const mockSequence = {
        effect: jest.fn(() => mockEffect),
        play: jest.fn()
      };

      global.Sequence = jest.fn(() => mockSequence);

      await AnimationHook.onCreateChatMessage(mockMessage);

      // Verify: Animation uses tokens from canvas.tokens.get(), not actor.getActiveTokens()
      expect(global.canvas.tokens.get).toHaveBeenCalledWith('source-token-999');
      expect(global.canvas.tokens.get).toHaveBeenCalledWith('target-token-888');
      expect(mockEffect.atLocation).toHaveBeenCalledWith(mockSourceTokenFromCanvas);
      expect(mockEffect.stretchTo).toHaveBeenCalledWith(mockTargetTokenFromCanvas);
    });

    it('uses target token ID from message data instead of game.user.targets', async () => {
      // Setup: GM has PC targeted, but message says attack targeted Enemy
      mockMessage.content = `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-attack-type="ranged"
        data-source-token-id="pc-token-123"
        data-target-token-id="enemy-token-456"
        data-rounds-fired="1">
      </div>`;

      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const mockActor = {
        items: {
          get: jest.fn(() => ({
            name: 'Bolter',
            system: { dmgType: 'Explosive' }
          }))
        }
      };

      global.game.actors.get = jest.fn(() => mockActor);

      // GM currently has PC targeted (wrong!)
      const gmCurrentTarget = { id: 'pc-token-999-WRONG', x: 50, y: 50 };
      global.game.user.targets.first = jest.fn(() => gmCurrentTarget);

      // Correct tokens from canvas
      const correctSourceToken = { id: 'pc-token-123', x: 100, y: 100 };
      const correctTargetToken = { id: 'enemy-token-456', x: 200, y: 200 };

      global.canvas.tokens.get = jest.fn((tokenId) => {
        if (tokenId === 'pc-token-123') return correctSourceToken;
        if (tokenId === 'enemy-token-456') return correctTargetToken;
        return null;
      });

      const mockEffect = {
        file: jest.fn().mockReturnThis(),
        atLocation: jest.fn().mockReturnThis(),
        stretchTo: jest.fn().mockReturnThis(),
        repeats: jest.fn().mockReturnValue(null)
      };

      const mockSequence = {
        effect: jest.fn(() => mockEffect),
        play: jest.fn()
      };

      global.Sequence = jest.fn(() => mockSequence);

      await AnimationHook.onCreateChatMessage(mockMessage);

      // Verify: Uses correct target from message, NOT game.user.targets
      expect(mockEffect.stretchTo).toHaveBeenCalledWith(correctTargetToken);
      expect(mockEffect.stretchTo).not.toHaveBeenCalledWith(gmCurrentTarget);
    });

    it('falls back to actor.getActiveTokens() if source-token-id not in message', async () => {
      // Backward compatibility: Old messages without token IDs
      mockMessage.content = `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-attack-type="ranged"
        data-rounds-fired="1">
      </div>`;

      global.game.modules.get = jest.fn((id) => {
        if (id === 'sequencer') return { active: true };
        if (id === 'jb2a_patreon') return { active: true };
        return null;
      });

      const fallbackSourceToken = { id: 'fallback-source', x: 100, y: 100 };
      const mockActor = {
        getActiveTokens: jest.fn(() => [fallbackSourceToken]),
        items: {
          get: jest.fn(() => ({
            name: 'Bolter',
            system: { dmgType: 'Explosive' }
          }))
        }
      };

      global.game.actors.get = jest.fn(() => mockActor);

      const fallbackTargetToken = { id: 'fallback-target', x: 200, y: 200 };
      global.game.user.targets.first = jest.fn(() => fallbackTargetToken);

      const mockEffect = {
        file: jest.fn().mockReturnThis(),
        atLocation: jest.fn().mockReturnThis(),
        stretchTo: jest.fn().mockReturnThis(),
        repeats: jest.fn().mockReturnValue(null)
      };

      const mockSequence = {
        effect: jest.fn(() => mockEffect),
        play: jest.fn()
      };

      global.Sequence = jest.fn(() => mockSequence);

      await AnimationHook.onCreateChatMessage(mockMessage);

      // Verify: Falls back to old behavior
      expect(mockActor.getActiveTokens).toHaveBeenCalled();
      expect(mockEffect.atLocation).toHaveBeenCalledWith(fallbackSourceToken);
      expect(mockEffect.stretchTo).toHaveBeenCalledWith(fallbackTargetToken);
    });

    it('exits early for psychic attacks (lets Automated Animations handle them)', async () => {
      // Arrange
      mockMessage.content = `<div class="dw-attack-roll"
        data-attack-type="psychic"
        data-actor-id="actor123"
        data-item-id="item456"
        data-animation-key="smite"
        data-source-token-id="token1"
        data-target-token-id="token2">
        <div>Focus Power result</div>
      </div>`;

      global.game.modules.get = jest.fn(() => ({ active: true }));

      // Act
      await AnimationHook.onCreateChatMessage(mockMessage);

      // Assert - should exit early, not call canvas.tokens.get
      expect(global.canvas.tokens.get).not.toHaveBeenCalled();
      expect(global.Sequence).not.toHaveBeenCalled();
    });

    it('exits early for grenade attacks (GrenadeHelper handles animation)', async () => {
      // Arrange
      mockMessage.content = `<div class="dw-attack-roll"
        data-attack-type="grenade"
        data-actor-id="actor123"
        data-item-id="item456"
        data-weapon-class="Thrown"
        data-source-token-id="token1"
        data-target-token-id="token2">
        <div>Grenade attack result</div>
      </div>`;

      global.game.modules.get = jest.fn(() => ({ active: true }));

      // Act
      await AnimationHook.onCreateChatMessage(mockMessage);

      // Assert - should exit early, not call canvas.tokens.get or play animation
      expect(global.canvas.tokens.get).not.toHaveBeenCalled();
      expect(global.Sequence).not.toHaveBeenCalled();
    });

    it('exits early when attackType is missing (explicit handling required)', async () => {
      // Arrange - message without data-attack-type attribute
      mockMessage.content = `<div class="dw-attack-roll"
        data-actor-id="actor123"
        data-item-id="item456"
        data-source-token-id="token1"
        data-target-token-id="token2">
        <div>Attack result</div>
      </div>`;

      global.game.modules.get = jest.fn(() => ({ active: true }));

      // Act
      await AnimationHook.onCreateChatMessage(mockMessage);

      // Assert - should exit early without attackType, no default fallback
      expect(global.canvas.tokens.get).not.toHaveBeenCalled();
      expect(global.Sequence).not.toHaveBeenCalled();
    });
  });
});
