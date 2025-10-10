// Game repository for casino, fishing, and hunting operations

import { BaseRepository } from './base.repository.js';

export class GameRepository extends BaseRepository {
  // Casino games
  async createCasinoGame(game: any): Promise<number> {
    const data = {
      character_id: game.character_id,
      game_type: game.game_type,
      bet_amount: game.bet_amount,
      win_amount: game.win_amount || 0,
      game_data: JSON.stringify(game.game_data || {}),
      result: game.result,
    };

    return this.create('CasinoGames', data);
  }

  async findCasinoGamesByCharacterId(characterId: number): Promise<any[]> {
    return this.findByCondition('CasinoGames', 'character_id = ?', [characterId]);
  }

  async findCasinoGamesByType(gameType: string): Promise<any[]> {
    return this.findByCondition('CasinoGames', 'game_type = ?', [gameType]);
  }

  // Horses
  async findAllHorses(): Promise<any[]> {
    return this.findAll('Horses');
  }

  async findHorseById(id: number): Promise<any | null> {
    return this.findById('Horses', id);
  }

  async updateHorseStats(horseId: number, stats: any): Promise<void> {
    const db = await this.getDb();
    await db.run(`
      UPDATE Horses 
      SET total_races = total_races + 1,
          wins = wins + ?,
          second_places = second_places + ?,
          third_places = third_places + ?,
          total_winnings = total_winnings + ?
      WHERE id = ?
    `, [stats.wins || 0, stats.second_places || 0, stats.third_places || 0, stats.total_winnings || 0, horseId]);
  }

  async createHorseRaceResult(result: any): Promise<number> {
    const data = {
      game_id: result.game_id,
      horse_id: result.horse_id,
      position: result.position,
      final_time: result.final_time,
      distance_covered: result.distance_covered,
    };

    return this.create('HorseRaceResults', data);
  }

  // Fishing
  async findFishingLocations(): Promise<any[]> {
    return this.findAll('FishingLocations');
  }

  async findFishingLocationById(id: number): Promise<any | null> {
    return this.findById('FishingLocations', id);
  }

  async findFishingGear(): Promise<any[]> {
    return this.findByCondition('FishingGear', 'is_active = ?', [1]);
  }

  async findCharacterFishingGear(characterId: number): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT cfg.*, fg.name, fg.type, fg.quality, fg.bonus_chance, fg.bonus_rarity, fg.is_consumable
      FROM CharacterFishingGear cfg
      JOIN FishingGear fg ON cfg.gear_id = fg.id
      WHERE cfg.character_id = ?
    `, [characterId]);
  }

  async addFishingGearToCharacter(characterId: number, gearId: number, quantity: number = 1): Promise<void> {
    const db = await this.getDb();
    const existing = await db.get(
      'SELECT * FROM CharacterFishingGear WHERE character_id = ? AND gear_id = ?',
      [characterId, gearId]
    );

    if (existing) {
      await db.run(
        'UPDATE CharacterFishingGear SET quantity = quantity + ? WHERE character_id = ? AND gear_id = ?',
        [quantity, characterId, gearId]
      );
    } else {
      await this.create('CharacterFishingGear', {
        character_id: characterId,
        gear_id: gearId,
        quantity,
        is_equipped: 0,
        condition: 1.0,
      });
    }
  }

  async removeFishingGearFromCharacter(characterId: number, gearId: number, quantity: number = 1): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'UPDATE CharacterFishingGear SET quantity = quantity - ? WHERE character_id = ? AND gear_id = ? AND quantity >= ?',
      [quantity, characterId, gearId, quantity]
    );
    await db.run(
      'DELETE FROM CharacterFishingGear WHERE character_id = ? AND gear_id = ? AND quantity <= 0',
      [characterId, gearId]
    );
  }

  async equipFishingGear(characterId: number, gearId: number, gearType: string): Promise<void> {
    const db = await this.getDb();
    // Unequip all gear of the same type
    await db.run(`
      UPDATE CharacterFishingGear 
      SET is_equipped = 0 
      WHERE character_id = ? AND gear_id IN (
        SELECT id FROM FishingGear WHERE type = ?
      )
    `, [characterId, gearType]);

    // Equip the new gear
    await db.run(
      'UPDATE CharacterFishingGear SET is_equipped = 1 WHERE character_id = ? AND gear_id = ?',
      [characterId, gearId]
    );
  }

  async addFishToInventory(characterId: number, speciesId: number, weight: number, locationId: number): Promise<number> {
    return this.create('CharacterFishInventory', {
      character_id: characterId,
      species_id: speciesId,
      weight,
      location_id: locationId,
      is_sold: 0,
      quality_modifier: 1.0,
    });
  }

  async findCharacterFishInventory(characterId: number): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT cfi.*, bs.name, bs.danger_rank, bs.habitat_type
      FROM CharacterFishInventory cfi
      JOIN BestiarySpecies bs ON cfi.species_id = bs.id
      WHERE cfi.character_id = ? AND cfi.is_sold = 0
      ORDER BY cfi.caught_at DESC
    `, [characterId]);
  }

  async sellFish(characterId: number, fishId: number): Promise<void> {
    await this.update('CharacterFishInventory', fishId, { is_sold: 1 });
  }

  // Hunting
  async findHuntingLocations(): Promise<any[]> {
    return this.findAll('HuntingLocations');
  }

  async findHuntingLocationById(id: number): Promise<any | null> {
    return this.findById('HuntingLocations', id);
  }

  async findHuntingGear(): Promise<any[]> {
    return this.findByCondition('HuntingGear', 'is_active = ?', [1]);
  }

  async findCharacterHuntingGear(characterId: number): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT chg.*, hg.name, hg.type, hg.quality, hg.bonus_damage, hg.bonus_defense, hg.bonus_success, hg.habitat_category, hg.is_consumable
      FROM CharacterHuntingGear chg
      JOIN HuntingGear hg ON chg.gear_id = hg.id
      WHERE chg.character_id = ?
    `, [characterId]);
  }

  async addHuntingGearToCharacter(characterId: number, gearId: number, quantity: number = 1): Promise<void> {
    const db = await this.getDb();
    const existing = await db.get(
      'SELECT * FROM CharacterHuntingGear WHERE character_id = ? AND gear_id = ?',
      [characterId, gearId]
    );

    if (existing) {
      await db.run(
        'UPDATE CharacterHuntingGear SET quantity = quantity + ? WHERE character_id = ? AND gear_id = ?',
        [quantity, characterId, gearId]
      );
    } else {
      await this.create('CharacterHuntingGear', {
        character_id: characterId,
        gear_id: gearId,
        quantity,
        is_equipped: 0,
        condition: 1.0,
      });
    }
  }

  async removeHuntingGearFromCharacter(characterId: number, gearId: number, quantity: number = 1): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'UPDATE CharacterHuntingGear SET quantity = quantity - ? WHERE character_id = ? AND gear_id = ? AND quantity >= ?',
      [quantity, characterId, gearId, quantity]
    );
    await db.run(
      'DELETE FROM CharacterHuntingGear WHERE character_id = ? AND gear_id = ? AND quantity <= 0',
      [characterId, gearId]
    );
  }

  async equipHuntingGear(characterId: number, gearId: number, gearType: string): Promise<void> {
    const db = await this.getDb();
    // Unequip all gear of the same type
    await db.run(`
      UPDATE CharacterHuntingGear 
      SET is_equipped = 0 
      WHERE character_id = ? AND gear_id IN (
        SELECT id FROM HuntingGear WHERE type = ?
      )
    `, [characterId, gearType]);

    // Equip the new gear
    await db.run(
      'UPDATE CharacterHuntingGear SET is_equipped = 1 WHERE character_id = ? AND gear_id = ?',
      [characterId, gearId]
    );
  }

  async addHuntToInventory(characterId: number, speciesId: number, lootItems: any[], locationId: number): Promise<number> {
    return this.create('CharacterHuntInventory', {
      character_id: characterId,
      species_id: speciesId,
      loot_items: JSON.stringify(lootItems),
      location_id: locationId,
      is_sold: 0,
      quality_modifier: 1.0,
    });
  }

  async findCharacterHuntInventory(characterId: number): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT chi.*, bs.name, bs.danger_rank, bs.habitat_type
      FROM CharacterHuntInventory chi
      JOIN BestiarySpecies bs ON chi.species_id = bs.id
      WHERE chi.character_id = ? AND chi.is_sold = 0
      ORDER BY chi.hunted_at DESC
    `, [characterId]);
  }

  async sellHunt(characterId: number, huntId: number): Promise<void> {
    await this.update('CharacterHuntInventory', huntId, { is_sold: 1 });
  }
}

