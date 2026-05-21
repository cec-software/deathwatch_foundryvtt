import { jest } from '@jest/globals';
import { GrenadeHelper } from '../../../src/module/helpers/combat/grenade-helper.mjs';

describe('GrenadeHelper', () => {
  let mockActor;
  let mockWeapon;
  let mockCanvasTargeting;
  let mockRangedCombatHelper;
  let mockAnimationHelper;

  beforeEach(() => {
    jest.clearAllMocks();

    mockActor = {
      id: 'actor-1',
      name: 'Test Marine',
      type: 'character',
      getActiveTokens: jest.fn().mockReturnValue([{
        id: 'token-1',
        center: { x: 100, y: 100 }
      }]),
      system: {
        characteristics: {
          str: { mod: 4 },
          bs: { value: 45 }
        }
      }
    };

    mockWeapon = {
      id: 'weapon-1',
      name: 'Frag Grenade',
      type: 'weapon',
      system: {
        class: 'Thrown',
        range: 'SBx3',
        rof: 'S/-/-',
        key: 'frag-grenade',
        attachedQualities: [{ id: 'blast', value: '4' }]
      }
    };

    mockCanvasTargeting = {
      selectLocation: jest.fn().mockResolvedValue({ x: 400, y: 300 })
    };

    mockRangedCombatHelper = {
      attackDialog: jest.fn().mockResolvedValue({ hitsTotal: 1, hitValue: 35, targetNumber: 50 }),
      rollScatter: jest.fn().mockResolvedValue({ direction: 'Upper Right', distance: 3 }),
      scatterToPixelOffset: jest.fn().mockReturnValue({ dx: 70.71, dy: -70.71 })
    };

    mockAnimationHelper = {
      areAnimationLibrariesAvailable: jest.fn().mockReturnValue(true),
      playGrenadeAnimation: jest.fn().mockResolvedValue(undefined)
    };

    global.canvas = {
      grid: { size: 100, distance: 3 },
      scene: {
        createEmbeddedDocuments: jest.fn().mockResolvedValue([])
      },
      regions: { activate: jest.fn() }
    };
    global.ui = { notifications: { info: jest.fn(), warn: jest.fn() } };
    global.game = {
      user: { id: 'user-1' },
      combat: { current: { turn: 0, round: 1 } }
    };

    GrenadeHelper._setMocks({
      CanvasTargeting: mockCanvasTargeting,
      RangedCombatHelper: mockRangedCombatHelper,
      AnimationHelper: mockAnimationHelper
    });
  });

  afterEach(() => {
    delete global.canvas;
    delete global.ui;
    delete global.game;
    GrenadeHelper._setMocks(null);
  });

  describe('executeGrenadeThrow', () => {
    it('should abort if actor has no token on scene', async () => {
      mockActor.getActiveTokens.mockReturnValue([]);

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(global.ui.notifications.warn).toHaveBeenCalledWith(
        expect.stringContaining('token')
      );
      expect(mockCanvasTargeting.selectLocation).not.toHaveBeenCalled();
    });

    it('should abort if user cancels canvas targeting', async () => {
      mockCanvasTargeting.selectLocation.mockResolvedValue(null);

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockRangedCombatHelper.attackDialog).not.toHaveBeenCalled();
    });

    it('should call attackDialog with targetLocation', async () => {
      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockRangedCombatHelper.attackDialog).toHaveBeenCalledWith(
        mockActor, mockWeapon, { targetLocation: { x: 400, y: 300 } }
      );
    });

    it('should not scatter on hit', async () => {
      mockRangedCombatHelper.attackDialog.mockResolvedValue({ hitsTotal: 1 });

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockRangedCombatHelper.rollScatter).not.toHaveBeenCalled();
    });

    it('should scatter on miss', async () => {
      mockRangedCombatHelper.attackDialog.mockResolvedValue({ hitsTotal: 0 });

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockRangedCombatHelper.rollScatter).toHaveBeenCalledWith(mockActor, mockWeapon);
      expect(mockRangedCombatHelper.scatterToPixelOffset).toHaveBeenCalledWith(
        'Upper Right', 3, { gridDistance: 3, gridSize: 100 }
      );
    });

    it('should play animation when libraries available', async () => {
      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockAnimationHelper.playGrenadeAnimation).toHaveBeenCalledWith(
        mockActor.getActiveTokens()[0],
        { x: 400, y: 300 },
        mockWeapon
      );
    });

    it('should skip animation when libraries unavailable', async () => {
      mockAnimationHelper.areAnimationLibrariesAvailable.mockReturnValue(false);

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockAnimationHelper.playGrenadeAnimation).not.toHaveBeenCalled();
    });

    it('should create blast Region when weapon has blast quality', async () => {
      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(global.canvas.scene.createEmbeddedDocuments).toHaveBeenCalledWith(
        'Region',
        [expect.objectContaining({
          name: 'Frag Grenade Blast',
          shapes: [expect.objectContaining({
            type: 'circle',
            x: 400,
            y: 300
          })]
        })]
      );
    });

    it('should not create Region when weapon has no blast quality', async () => {
      mockWeapon.system.attachedQualities = [];

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(global.canvas.scene.createEmbeddedDocuments).not.toHaveBeenCalled();
    });

    it('should use scattered location for Region on miss', async () => {
      mockRangedCombatHelper.attackDialog.mockResolvedValue({ hitsTotal: 0 });

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(global.canvas.scene.createEmbeddedDocuments).toHaveBeenCalledWith(
        'Region',
        [expect.objectContaining({
          shapes: [expect.objectContaining({
            x: 400 + 70.71,
            y: 300 + (-70.71)
          })]
        })]
      );
    });

    it('should abort if attackDialog returns null (user cancelled dialog)', async () => {
      mockRangedCombatHelper.attackDialog.mockResolvedValue(null);

      await GrenadeHelper.executeGrenadeThrow(mockActor, mockWeapon);

      expect(mockAnimationHelper.playGrenadeAnimation).not.toHaveBeenCalled();
      expect(global.canvas.scene.createEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });
});
