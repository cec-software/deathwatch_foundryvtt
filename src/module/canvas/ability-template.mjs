/**
 * Helper class for building interactive MeasuredTemplates for Deathwatch weapons and psychic powers.
 * Based on D&D5e's AbilityTemplate pattern.
 */
export default class AbilityTemplate extends foundry.canvas.placeables.MeasuredTemplate {
  /**
   * Create an AbilityTemplate instance from weapon/power data.
   * @param {Object} config - Template configuration
   * @param {string} config.type - Template type (cone, circle, ray)
   * @param {number} config.distance - Template distance in meters
   * @param {number} config.angle - Template angle (for cones)
   * @returns {AbilityTemplate}
   */
  static fromConfig(config) {
    const templateData = {
      t: config.type,
      distance: config.distance,
      angle: config.angle || 90,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color,
      flags: {
        deathwatch: {
          createdByTurn: game.combat?.current.turn,
          createdInRound: game.combat?.current.round,
          isAttackTemplate: true
        }
      }
    };

    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, { parent: canvas.scene });
    return new this(template);
  }

  /**
   * Creates an interactive preview of the template.
   * Returns a promise that resolves with the final template document if placed.
   * @returns {Promise<MeasuredTemplateDocument|null>}
   */
  drawPreview() {
    const initialLayer = canvas.activeLayer;

    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Activate interactivity
    return this.activatePreviewListeners(initialLayer);
  }

  /**
   * Activate listeners for the template preview.
   * @param {CanvasLayer} initialLayer - The initially active layer to restore
   * @returns {Promise<MeasuredTemplateDocument|null>}
   */
  activatePreviewListeners(initialLayer) {
    return new Promise((resolve, reject) => {
      const handlers = {
        move: this._onMovePlacement.bind(this),
        rotate: this._onRotatePlacement.bind(this),
        confirm: this._onConfirmPlacement.bind(this),
        cancel: this._onCancelPlacement.bind(this),
        resolve,
        reject,
        initialLayer
      };

      // Bind event handlers
      canvas.stage.on('mousemove', handlers.move);
      canvas.stage.on('mousedown', handlers.confirm);
      canvas.app.view.addEventListener('contextmenu', handlers.cancel);
      canvas.app.view.addEventListener('wheel', handlers.rotate, { passive: false });

      // Store handlers for cleanup
      this._handlers = handlers;
    });
  }

  /**
   * Handle mouse movement - update template position.
   * @param {PIXI.InteractionEvent} event
   * @private
   */
  _onMovePlacement(event) {
    event.stopPropagation();
    const now = Date.now();
    if (now - (this._moveTime || 0) <= 20) return;
    const center = event.data.getLocalPosition(this.layer);
    const snapped = canvas.grid.getSnappedPoint({ x: center.x, y: center.y }, { mode: 2 });
    this.document.updateSource({ x: snapped.x, y: snapped.y });
    this.renderFlags.set({ refresh: true });
    this._moveTime = now;
  }

  /**
   * Handle mouse wheel - rotate template.
   * @param {WheelEvent} event
   * @private
   */
  _onRotatePlacement(event) {
    if (event.ctrlKey) event.preventDefault();
    event.stopPropagation();
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = event.shiftKey ? delta : 5;
    this.document.updateSource({
      direction: this.document.direction + (snap * Math.sign(event.deltaY))
    });
    this.renderFlags.set({ refresh: true });
  }

  /**
   * Handle left-click - confirm placement.
   * @param {PIXI.InteractionEvent} event
   * @private
   */
  async _onConfirmPlacement(event) {
    event.stopPropagation();
    const { resolve } = this._handlers;

    // Create the actual template document
    try {
      const doc = await CONFIG.MeasuredTemplate.documentClass.create(
        this.document.toObject(),
        { parent: canvas.scene }
      );
      resolve(doc);
    } catch (err) {
      resolve(null);
    } finally {
      this._finishPlacement();
    }
  }

  /**
   * Handle right-click - cancel placement.
   * @param {Event} event
   * @private
   */
  _onCancelPlacement(event) {
    event.preventDefault();
    event.stopPropagation();
    const { resolve } = this._handlers;
    resolve(null);
    this._finishPlacement();
  }

  /**
   * Clean up event handlers and restore previous layer.
   * @private
   */
  _finishPlacement() {
    const { move, rotate, confirm, cancel, initialLayer } = this._handlers;

    // Remove event handlers
    canvas.stage.off('mousemove', move);
    canvas.stage.off('mousedown', confirm);
    canvas.app.view.removeEventListener('contextmenu', cancel);
    canvas.app.view.removeEventListener('wheel', rotate);

    // Remove preview and restore layer
    this.layer.preview.removeChild(this);
    initialLayer.activate();
  }
}
