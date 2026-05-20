import { jest } from '@jest/globals';
import { CharacterDataPreparer } from '../../src/module/sheets/shared/data-preparers/character-data-preparer.mjs';

describe('CharacterDataPreparer', () => {
  describe('_addRankAvailability', () => {
    it('marks skill as available when specialty provides cost override for forbidden skill', () => {
      // Simulate lore_forbidden_adeptus_mechanicus for Tech Marine at Rank 1
      const skill = {
        training: {
          trained: null,  // Forbidden by default
          mastered: null,
          expert: null
        },
        costTrain: 400,  // Made available by Tech Marine specialty at rank 1
        costMaster: undefined,
        costExpert: undefined
      };

      const currentRank = 1;

      CharacterDataPreparer._addRankAvailability(skill, 'lore_forbidden_adeptus_mechanicus', currentRank);

      // Should be available at rank 1 because specialty provides cost override
      expect(skill.trainedAvailable).toBe(true);
      expect(skill.trainedRankRequired).toBe(1);
      expect(skill.masteredAvailable).toBe(false);
      expect(skill.masteredRankRequired).toBe(-1);
      expect(skill.expertAvailable).toBe(false);
      expect(skill.expertRankRequired).toBe(-1);
    });

    it('marks skill as unavailable when no cost override exists for forbidden skill', () => {
      // Simulate a forbidden skill with no specialty override
      const skill = {
        training: {
          trained: null,
          mastered: null,
          expert: null
        },
        costTrain: undefined,
        costMaster: undefined,
        costExpert: undefined
      };

      const currentRank = 1;

      CharacterDataPreparer._addRankAvailability(skill, 'lore_forbidden_archeotech', currentRank);

      // Should remain unavailable
      expect(skill.trainedAvailable).toBe(false);
      expect(skill.trainedRankRequired).toBe(-1);
      expect(skill.masteredAvailable).toBe(false);
      expect(skill.masteredRankRequired).toBe(-1);
      expect(skill.expertAvailable).toBe(false);
      expect(skill.expertRankRequired).toBe(-1);
    });

    it('respects rank requirements from base skill definition', () => {
      // Simulate a normal skill with rank requirements
      const skill = {
        training: {
          trained: { cost: 800, rank: 2 },
          mastered: { cost: 800, rank: 4 },
          expert: { cost: 800, rank: 6 }
        },
        costTrain: 800,
        costMaster: 800,
        costExpert: 800
      };

      const currentRank = 3;

      CharacterDataPreparer._addRankAvailability(skill, 'charm', currentRank);

      // Rank 3: trained available, mastered not yet, expert not yet
      expect(skill.trainedAvailable).toBe(true);
      expect(skill.trainedRankRequired).toBe(2);
      expect(skill.masteredAvailable).toBe(false);
      expect(skill.masteredRankRequired).toBe(4);
      expect(skill.expertAvailable).toBe(false);
      expect(skill.expertRankRequired).toBe(6);
    });

    it('marks specialty-overridden mastered level as available at current rank', () => {
      // Simulate Tech Marine rank 2 unlocking mastered level
      const skill = {
        training: {
          trained: null,
          mastered: null,
          expert: null
        },
        costTrain: 400,   // Available from rank 1
        costMaster: 400,  // Available from rank 2
        costExpert: undefined
      };

      const currentRank = 2;
      const specialtyRankReqs = {
        lore_forbidden_adeptus_mechanicus: {
          trainedRank: 1,
          masteredRank: 2
        }
      };

      CharacterDataPreparer._addRankAvailability(skill, 'lore_forbidden_adeptus_mechanicus', currentRank, specialtyRankReqs);

      expect(skill.trainedAvailable).toBe(true);
      expect(skill.trainedRankRequired).toBe(1);
      expect(skill.masteredAvailable).toBe(true);
      expect(skill.masteredRankRequired).toBe(2);
      expect(skill.expertAvailable).toBe(false);
      expect(skill.expertRankRequired).toBe(-1);
    });

    it('uses specialty rank requirements when provided (rank 3 expert override)', () => {
      // Simulate Tech Marine rank 3 unlocking expert level at rank 3
      const skill = {
        training: {
          trained: null,
          mastered: null,
          expert: null
        },
        costTrain: 400,
        costMaster: 400,
        costExpert: 400
      };

      const currentRank = 3;
      const specialtyRankReqs = {
        lore_forbidden_adeptus_mechanicus: {
          trainedRank: 1,
          masteredRank: 2,
          expertRank: 3
        }
      };

      CharacterDataPreparer._addRankAvailability(skill, 'lore_forbidden_adeptus_mechanicus', currentRank, specialtyRankReqs);

      expect(skill.trainedAvailable).toBe(true);
      expect(skill.trainedRankRequired).toBe(1);
      expect(skill.masteredAvailable).toBe(true);
      expect(skill.masteredRankRequired).toBe(2);
      expect(skill.expertAvailable).toBe(true);
      expect(skill.expertRankRequired).toBe(3);
    });

    it('marks skill unavailable when current rank is below specialty rank requirement', () => {
      // Simulate rank 1 character - mastered not yet available
      const skill = {
        training: {
          trained: null,
          mastered: null,
          expert: null
        },
        costTrain: 400,
        costMaster: 400
      };

      const currentRank = 1;
      const specialtyRankReqs = {
        lore_forbidden_adeptus_mechanicus: {
          trainedRank: 1,
          masteredRank: 2
        }
      };

      CharacterDataPreparer._addRankAvailability(skill, 'lore_forbidden_adeptus_mechanicus', currentRank, specialtyRankReqs);

      expect(skill.trainedAvailable).toBe(true);
      expect(skill.trainedRankRequired).toBe(1);
      expect(skill.masteredAvailable).toBe(false); // Not rank 2 yet
      expect(skill.masteredRankRequired).toBe(2);
    });

    it('uses specialty rank override when base skill has higher rank requirement (Security/Techmarine case)', () => {
      // Simulate Security skill (base rank 3) being made available at Rank 1 by Techmarine specialty
      const skill = {
        training: {
          trained: { cost: 800, rank: 3 },   // Base skill requires rank 3
          mastered: { cost: 800, rank: 5 },
          expert: { cost: 800, rank: 7 }
        },
        costTrain: 400,  // Techmarine overrides cost to 400
        costMaster: 800,
        costExpert: 800
      };

      const currentRank = 1;
      const specialtyRankReqs = {
        security: {
          trainedRank: 1  // Techmarine makes it available at rank 1
        }
      };

      CharacterDataPreparer._addRankAvailability(skill, 'security', currentRank, specialtyRankReqs);

      // Should use specialty rank requirement (1) instead of base rank requirement (3)
      expect(skill.trainedAvailable).toBe(true);
      expect(skill.trainedRankRequired).toBe(1);
      expect(skill.masteredAvailable).toBe(false); // Still requires rank 5
      expect(skill.masteredRankRequired).toBe(5);
    });
  });

  describe('prepareWeapons', () => {
    beforeEach(() => {
      // Mock game.packs.get for weapon-qualities compendium
      global.game = {
        packs: {
          get: jest.fn((packId) => {
            if (packId === 'deathwatch.weapon-qualities') {
              return {
                getDocument: jest.fn(async (qualityId) => {
                  if (qualityId === 'flame-quality-id') {
                    return { system: { key: 'flame' } };
                  }
                  if (qualityId === 'tearing-quality-id') {
                    return { system: { key: 'tearing' } };
                  }
                  return null;
                })
              };
            }
            return null;
          })
        }
      };
    });

    it('adds hasFlame flag to weapon with flame quality', async () => {
      const context = {
        items: [
          {
            name: 'Hand Flamer',
            type: 'weapon',
            _id: 'weapon1',
            system: {
              equipped: true,
              attachedQualities: ['flame-quality-id']
            }
          }
        ]
      };

      await CharacterDataPreparer.prepareWeapons(context);

      const weapon = context.items.find(i => i.name === 'Hand Flamer');
      expect(weapon.hasFlame).toBe(true);
    });

    it('sets hasFlame to false for weapon without flame quality', async () => {
      const context = {
        items: [
          {
            name: 'Bolter',
            type: 'weapon',
            _id: 'weapon2',
            system: {
              equipped: true,
              attachedQualities: ['tearing-quality-id']
            }
          }
        ]
      };

      await CharacterDataPreparer.prepareWeapons(context);

      const weapon = context.items.find(i => i.name === 'Bolter');
      expect(weapon.hasFlame).toBe(false);
    });
  });
});
