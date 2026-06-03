# Memory Index

This directory contains project-specific memory for Claude Code. These memories are version controlled and shared with the repository.

**Documentation Structure:**
- **[CLAUDE.md](../../CLAUDE.md)** — Quick start + essential commands + pointers to detailed docs
- **[.claude/memory/](MEMORY.md)** — This directory: Session learnings, workflow preferences, project history (evolves over time)
- **[.claude/docs/](../docs/README.md)** — Deep-dive developer reference documentation (loaded on demand)
- **[docs/](../../docs/)** — User-facing guides for GMs and players (not for Claude)

When starting work on this project, read CLAUDE.md first for quick start, then consult memory files for workflow context, and dive into `.claude/docs/` for detailed subsystem documentation.

---

## Foundation Memories

- [Project Overview](project_overview.md) — Foundry VTT v13 Deathwatch RPG system
- [Architecture](architecture.md) — TypeDataModel pattern, helper organization
- [Development Workflow](development_workflow.md) — Build, test, deploy commands

## System Memories

- [Testing Standards](testing_standards.md) — Jest with ES modules, comprehensive test suite (1800+ tests)
- [Compendium System](compendium_system.md) — Source JSON, validation, ID conventions
- [Macro System](macro_system.md) — Three-tier macro architecture (compendium, API, drag-drop)

## User Preferences

- [UI Preferences](user_ui_preferences.md) — Compact layouts, information density, small sizing increments

## Feedback

- [Code Quality Standards](feedback_code_quality.md) — Logger usage, missing imports, test-first development
- [Characteristic Damage Migration](feedback_characteristic_damage_migration.md) — Use system.modifiers array not Active Effects
- [Socket Permissions Pattern](socket_permissions.md) — Player-to-GM action routing via socket for document permission bypass

## Projects

- [Flamer Workflow Implementation](flamer_workflow_implementation.md) — Single damage roll with multi-target application, animation on attack, ammo tracking
- [Psychic Flame Powers](psychic_flame_powers.md) — Avenger psychic power uses flamer workflow, penetration calculation bug fix
- [WebP Conversion](project_webp_conversion.md) — Ongoing icon optimization initiative (10 weapons converted)
- [TDD Example: XP Calculator](project_tdd_example.md) — Reference implementation of test-driven development workflow
- [Legacy Weapon Modifier Removal](project_legacy_weapon_modifier_removal.md) — Consolidated duplicate modifier logic into WeaponModifierCollector (~170 lines removed)
- [Horde Breaking Implementation](horde_breaking_implementation.md) — Turn-based breaking mechanics, combat hook timing, dual condition application

## Reference

- [Build Scripts](reference_build_scripts.md) — Location and purpose of build pipeline scripts
- [Test Organization](reference_tests.md) — Test file structure and patterns
- [Animation System Architecture](animation_system.md) — Chat message data attributes, AnimationHook behavior, preventing dual-firing bugs

---

**Note:** These are project-level memories that should be version controlled. User-specific preferences (coding style, personal workflow) should remain in `~/.claude/` user directory.
