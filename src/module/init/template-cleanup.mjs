/**
 * Register hook for template cleanup on combat turn change.
 */
export function registerTemplateCleanupHook() {
  Hooks.on('updateCombat', async (combat, changed, options, userId) => {
    // Only clean up when turn or round changes
    if (!('turn' in changed || 'round' in changed)) {
      return;
    }

    // Only clean up if there's a previous turn
    if (!combat.previous) {
      return;
    }

    // Suppress deprecation warnings in v14 (MeasuredTemplate still works, just deprecated)
    const originalWarn = foundry.utils.logCompatibilityWarning;
    foundry.utils.logCompatibilityWarning = () => {};

    try {
      // Find templates from previous turn
      const templates = canvas.templates?.placeables || [];

      const templatesToDelete = templates.filter(template => {
        const flags = template.document.flags?.deathwatch;
        if (!flags || !flags.isAttackTemplate) {
          return false;
        }

        return (
          flags.createdByTurn === combat.previous.turn &&
          flags.createdInRound === combat.previous.round
        );
      });

      // Delete template documents
      const idsToDelete = templatesToDelete.map(t => t.document.id);
      if (idsToDelete.length > 0) {
        await canvas.scene.deleteEmbeddedDocuments('MeasuredTemplate', idsToDelete);
      }
    } finally {
      // Restore deprecation warnings
      foundry.utils.logCompatibilityWarning = originalWarn;
    }
  });
}
