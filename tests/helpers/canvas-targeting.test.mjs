import { jest } from '@jest/globals';
import { CanvasTargeting } from '../../src/module/helpers/ui/canvas-targeting.mjs';

describe('CanvasTargeting', () => {
  let mockOverlay;
  let overlayListeners;

  beforeEach(() => {
    overlayListeners = {};
    mockOverlay = {
      style: {},
      addEventListener: jest.fn((event, handler) => {
        overlayListeners[event] = handler;
      }),
      remove: jest.fn()
    };

    global.document = {
      body: {
        appendChild: jest.fn()
      },
      createElement: jest.fn(() => mockOverlay),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    global.canvas = {
      canvasCoordinatesFromClient: jest.fn(({ x, y }) => ({ x, y }))
    };
    global.ui = { notifications: { info: jest.fn() } };
  });

  afterEach(() => {
    delete global.document;
    delete global.canvas;
    delete global.ui;
  });

  it('should resolve with coordinates on left-click', async () => {
    const promise = CanvasTargeting.selectLocation();

    overlayListeners['pointerdown']({
      button: 0,
      clientX: 250,
      clientY: 350
    });

    const result = await promise;
    expect(result).toEqual({ x: 250, y: 350 });
  });

  it('should convert client coordinates to canvas coordinates', async () => {
    global.canvas.canvasCoordinatesFromClient.mockReturnValue({ x: 500, y: 600 });
    const promise = CanvasTargeting.selectLocation();

    overlayListeners['pointerdown']({
      button: 0,
      clientX: 100,
      clientY: 200
    });

    const result = await promise;
    expect(global.canvas.canvasCoordinatesFromClient).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(result).toEqual({ x: 500, y: 600 });
  });

  it('should resolve null on right-click', async () => {
    const promise = CanvasTargeting.selectLocation();

    overlayListeners['pointerdown']({
      button: 2,
      preventDefault: jest.fn()
    });

    const result = await promise;
    expect(result).toBeNull();
  });

  it('should resolve null on Escape key', async () => {
    const promise = CanvasTargeting.selectLocation();

    const escCallback = global.document.addEventListener.mock.calls.find(
      c => c[0] === 'keydown'
    )[1];
    escCallback({ key: 'Escape' });

    const result = await promise;
    expect(result).toBeNull();
  });

  it('should create overlay with crosshair cursor', () => {
    CanvasTargeting.selectLocation();

    expect(global.document.createElement).toHaveBeenCalledWith('div');
    expect(mockOverlay.style.cssText).toContain('cursor:crosshair');
    expect(global.document.body.appendChild).toHaveBeenCalledWith(mockOverlay);
  });

  it('should remove overlay after selection', async () => {
    const promise = CanvasTargeting.selectLocation();

    overlayListeners['pointerdown']({
      button: 0,
      clientX: 100,
      clientY: 100
    });

    await promise;
    expect(mockOverlay.remove).toHaveBeenCalled();
  });

  it('should remove event listeners after selection', async () => {
    const promise = CanvasTargeting.selectLocation();

    overlayListeners['pointerdown']({
      button: 0,
      clientX: 100,
      clientY: 100
    });

    await promise;
    expect(global.document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should show prompt notification', () => {
    CanvasTargeting.selectLocation({ prompt: 'Click to throw grenade' });
    expect(global.ui.notifications.info).toHaveBeenCalledWith('Click to throw grenade');
  });

  it('should use default prompt when none provided', () => {
    CanvasTargeting.selectLocation();
    expect(global.ui.notifications.info).toHaveBeenCalledWith('Click canvas to select target location');
  });

  it('should ignore middle-click button', async () => {
    const promise = CanvasTargeting.selectLocation();

    // Middle click should be ignored
    overlayListeners['pointerdown']({
      button: 1,
      clientX: 999,
      clientY: 999
    });

    // Promise should still be pending — resolve with a left-click
    overlayListeners['pointerdown']({
      button: 0,
      clientX: 50,
      clientY: 50
    });

    const result = await promise;
    expect(result).toEqual({ x: 50, y: 50 });
  });
});
