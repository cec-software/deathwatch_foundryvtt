import { jest } from '@jest/globals';
import { GrenadeHelper } from '../../src/module/helpers/combat/grenade-helper.mjs';

describe('Grenade Throw Flow Integration', () => {
  let mockActor;
  let fragGrenade;
  let krakGrenade;

  beforeEach(() => {
    jest.clearAllMocks();

    mockActor = {
      id: 'actor-1',
      name: 'Brother Thaddeus',
      type: 'character',
      getActiveTokens: jest.fn().mockReturnValue([{
        id: 'token-1',
        center: { x: 200, y: 200 }
      }]),
      system: {
        characteristics: {
          str: { mod: 5 },
          bs: { value: 45 }
        }
      }
    };

    fragGrenade = {
      id: 'frag-1',
      name: 'Frag Grenade',
      type: 'weapon',
      system: {
        class: 'Thrown',
        range: 'SBx3',
        rof: 'S/-/-',
        clip: '1',
        key: 'frag-grenade',
        attachedQualities: [{ id: 'blast', value: '4' }]
      }
    };

    krakGrenade = {
      id: 'krak-1',
      name: 'Krak Grenade',
      type: 'weapon',
      system: {
        class: 'Thrown',
        range: 'SBx3',
        rof: 'S/-/-',
        clip: '1',
        key: 'krak-grenade',
        attachedQualities: []
      }
    };

    global.canvas = {
      grid: { size: 100, distance: 3 },
      scene: { createEmbeddedDocuments: jest.fn().mockResolvedValue([]) },
      regions: { activate: jest.fn() }
    };
    global.ui = { notifications: { info: jest.fn(), warn: jest.fn() } };
    global.game = {
      user: { id: 'user-1' },
      combat: { current: { turn: 1, round: 2 } }
    };
  });

  afterEach(() => {
    delete global.canvas;
    delete global.ui;
    delete global.game;
    GrenadeHelper._setMocks(null);
  });

  it('should complete full hit flow: target → roll → animate → region', async () => {
    GrenadeHelper._setMocks({
      CanvasTargeting: {
        selectLocation: jest.fn().mockResolvedValue({ x: 500, y: 400 })
      },
      RangedCombatHelper: {
        attackDialog: jest.fn().mockResolvedValue({ hitsTotal: 1, hitValue: 30, targetNumber: 50 }),
        rollScatter: jest.fn(),
        scatterToPixelOffset: jest.fn()
      },
      AnimationHelper: {
        areAnimationLibrariesAvailable: jest.fn().mockReturnValue(true),
        playGrenadeAnimation: jest.fn().mockResolvedValue(undefined)
      }
    });

    await GrenadeHelper.executeGrenadeThrow(mockActor, fragGrenade);

    const mocks = GrenadeHelper._mocks;
    expect(mocks.RangedCombatHelper.rollScatter).not.toHaveBeenCalled();
    expect(mocks.AnimationHelper.playGrenadeAnimation).toHaveBeenCalledWith(
      mockActor.getActiveTokens()[0],
      { x: 500, y: 400 },
      fragGrenade
    );
    expect(global.canvas.scene.createEmbeddedDocuments).toHaveBeenCalledWith(
      'Region',
      [expect.objectContaining({
        name: 'Frag Grenade Blast',
        shapes: [expect.objectContaining({ x: 500, y: 400, radius: expect.any(Number) })]
      })]
    );
  });

  it('should complete full miss flow with scatter offset', async () => {
    GrenadeHelper._setMocks({
      CanvasTargeting: {
        selectLocation: jest.fn().mockResolvedValue({ x: 500, y: 400 })
      },
      RangedCombatHelper: {
        attackDialog: jest.fn().mockResolvedValue({ hitsTotal: 0, hitValue: 85, targetNumber: 50 }),
        rollScatter: jest.fn().mockResolvedValue({ direction: 'Right', distance: 3 }),
        scatterToPixelOffset: jest.fn().mockReturnValue({ dx: 100, dy: 0 })
      },
      AnimationHelper: {
        areAnimationLibrariesAvailable: jest.fn().mockReturnValue(true),
        playGrenadeAnimation: jest.fn().mockResolvedValue(undefined)
      }
    });

    await GrenadeHelper.executeGrenadeThrow(mockActor, fragGrenade);

    const mocks = GrenadeHelper._mocks;
    expect(mocks.AnimationHelper.playGrenadeAnimation).toHaveBeenCalledWith(
      mockActor.getActiveTokens()[0],
      { x: 600, y: 400 },
      fragGrenade
    );
    expect(global.canvas.scene.createEmbeddedDocuments).toHaveBeenCalledWith(
      'Region',
      [expect.objectContaining({
        shapes: [expect.objectContaining({ x: 600, y: 400 })]
      })]
    );
  });

  it('should skip Region for krak grenade (no blast quality)', async () => {
    GrenadeHelper._setMocks({
      CanvasTargeting: {
        selectLocation: jest.fn().mockResolvedValue({ x: 300, y: 300 })
      },
      RangedCombatHelper: {
        attackDialog: jest.fn().mockResolvedValue({ hitsTotal: 1 }),
        rollScatter: jest.fn(),
        scatterToPixelOffset: jest.fn()
      },
      AnimationHelper: {
        areAnimationLibrariesAvailable: jest.fn().mockReturnValue(true),
        playGrenadeAnimation: jest.fn().mockResolvedValue(undefined)
      }
    });

    await GrenadeHelper.executeGrenadeThrow(mockActor, krakGrenade);

    expect(global.canvas.scene.createEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it('should work without animation libraries', async () => {
    GrenadeHelper._setMocks({
      CanvasTargeting: {
        selectLocation: jest.fn().mockResolvedValue({ x: 400, y: 400 })
      },
      RangedCombatHelper: {
        attackDialog: jest.fn().mockResolvedValue({ hitsTotal: 1 }),
        rollScatter: jest.fn(),
        scatterToPixelOffset: jest.fn()
      },
      AnimationHelper: {
        areAnimationLibrariesAvailable: jest.fn().mockReturnValue(false),
        playGrenadeAnimation: jest.fn()
      }
    });

    await GrenadeHelper.executeGrenadeThrow(mockActor, fragGrenade);

    const mocks = GrenadeHelper._mocks;
    expect(mocks.AnimationHelper.playGrenadeAnimation).not.toHaveBeenCalled();
    expect(global.canvas.scene.createEmbeddedDocuments).toHaveBeenCalled();
  });
});
