// Character repository for database operations

import { BaseRepository } from './base.repository.js';
import { Character, Contract, Update } from '../types/index.js';

export class CharacterRepository extends BaseRepository {
  // Characters
  async findCharacterById(id: number): Promise<any | null> {
    return this.findById('Characters', id);
  }

  async findCharacterByVkId(vkId: number): Promise<any[]> {
    return this.findByCondition('Characters', 'vk_id = ?', [vkId]);
  }

  async findCharactersByStatus(status: string): Promise<any[]> {
    return this.findByCondition('Characters', 'status = ?', [status]);
  }

  async findAllCharacters(): Promise<any[]> {
    return this.findAll('Characters');
  }

  async createCharacter(character: any): Promise<number> {
    const data = {
      vk_id: character.vk_id,
      status: character.status || 'На рассмотрении',
      character_name: character.character_name,
      nickname: character.nickname || null,
      age: character.age,
      rank: character.rank,
      faction: character.faction,
      faction_position: character.faction_position,
      home_island: character.home_island,
      appearance: JSON.stringify(character.appearance || {}),
      character_images: JSON.stringify(character.character_images || []),
      personality: character.personality || '',
      biography: character.biography || '',
      life_status: character.life_status || 'Жив',
      archetypes: JSON.stringify(character.archetypes || []),
      attributes: JSON.stringify(character.attributes || {}),
      attribute_points_total: character.attribute_points_total || 0,
      attribute_points_spent: character.attribute_points_spent || 0,
      aura_cells: JSON.stringify(character.aura_cells || {}),
      inventory: JSON.stringify(character.inventory || []),
      currency: character.currency || 0,
      admin_note: character.admin_note || null,
    };

    return this.create('Characters', data);
  }

  async updateCharacter(id: number, character: any): Promise<void> {
    const data: any = {};

    if (character.status !== undefined) data.status = character.status;
    if (character.character_name !== undefined) data.character_name = character.character_name;
    if (character.nickname !== undefined) data.nickname = character.nickname;
    if (character.age !== undefined) data.age = character.age;
    if (character.rank !== undefined) data.rank = character.rank;
    if (character.faction !== undefined) data.faction = character.faction;
    if (character.faction_position !== undefined) data.faction_position = character.faction_position;
    if (character.home_island !== undefined) data.home_island = character.home_island;
    if (character.appearance !== undefined) data.appearance = JSON.stringify(character.appearance);
    if (character.character_images !== undefined) data.character_images = JSON.stringify(character.character_images);
    if (character.personality !== undefined) data.personality = character.personality;
    if (character.biography !== undefined) data.biography = character.biography;
    if (character.life_status !== undefined) data.life_status = character.life_status;
    if (character.archetypes !== undefined) data.archetypes = JSON.stringify(character.archetypes);
    if (character.attributes !== undefined) data.attributes = JSON.stringify(character.attributes);
    if (character.attribute_points_total !== undefined) data.attribute_points_total = character.attribute_points_total;
    if (character.attribute_points_spent !== undefined) data.attribute_points_spent = character.attribute_points_spent;
    if (character.aura_cells !== undefined) data.aura_cells = JSON.stringify(character.aura_cells);
    if (character.inventory !== undefined) data.inventory = JSON.stringify(character.inventory);
    if (character.currency !== undefined) data.currency = character.currency;
    if (character.admin_note !== undefined) data.admin_note = character.admin_note;

    data.updated_at = new Date().toISOString();

    await this.update('Characters', id, data);
  }

  async deleteCharacter(id: number): Promise<void> {
    await this.delete('Characters', id);
  }

  async updateCharacterCurrency(characterId: number, amount: number): Promise<void> {
    const db = await this.getDb();
    await db.run('UPDATE Characters SET currency = currency + ? WHERE id = ?', [amount, characterId]);
  }

  // Contracts
  async findContractsByCharacterId(characterId: number): Promise<any[]> {
    return this.findByCondition('Contracts', 'character_id = ?', [characterId]);
  }

  async createContract(contract: any): Promise<number> {
    const data = {
      character_id: contract.character_id,
      contract_name: contract.contract_name || null,
      creature_name: contract.creature_name || null,
      creature_rank: contract.creature_rank || null,
      creature_spectrum: contract.creature_spectrum || null,
      creature_description: contract.creature_description || null,
      creature_images: JSON.stringify(contract.creature_images || []),
      gift: contract.gift || null,
      sync_level: contract.sync_level || 0,
      unity_stage: contract.unity_stage || null,
      abilities: JSON.stringify(contract.abilities || {}),
      manifestation: JSON.stringify(contract.manifestation || null),
      dominion: JSON.stringify(contract.dominion || null),
    };

    return this.create('Contracts', data);
  }

  async deleteContractsByCharacterId(characterId: number): Promise<void> {
    await this.deleteByCondition('Contracts', 'character_id = ?', [characterId]);
  }

  // Updates
  async findUpdateById(id: number): Promise<any | null> {
    return this.findById('CharacterUpdates', id);
  }

  async findUpdatesByStatus(status: string): Promise<any[]> {
    return this.findByCondition('CharacterUpdates', 'status = ?', [status]);
  }

  async findAllUpdates(): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT 
        cu.*,
        c.character_name,
        c.vk_id,
        c.rank,
        c.faction
      FROM CharacterUpdates cu
      LEFT JOIN Characters c ON cu.character_id = c.id
      ORDER BY cu.created_at DESC
    `);
  }

  async createUpdate(update: any): Promise<number> {
    const data = {
      character_id: update.character_id,
      updated_data: JSON.stringify(update.updated_data),
      status: update.status || 'pending',
    };

    return this.create('CharacterUpdates', data);
  }

  async updateUpdateStatus(id: number, status: string): Promise<void> {
    await this.update('CharacterUpdates', id, { status });
  }

  async deleteUpdate(id: number): Promise<void> {
    await this.delete('CharacterUpdates', id);
  }

  // Character search and filtering
  async searchCharacters(searchTerm: string): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT * FROM Characters 
      WHERE character_name LIKE ? OR nickname LIKE ?
    `, [`%${searchTerm}%`, `%${searchTerm}%`]);
  }

  async findCharactersByFaction(faction: string): Promise<any[]> {
    return this.findByCondition('Characters', 'faction = ?', [faction]);
  }

  async findCharactersByRank(rank: string): Promise<any[]> {
    return this.findByCondition('Characters', 'rank = ?', [rank]);
  }

  // Character count
  async countCharacters(): Promise<number> {
    return this.count('Characters');
  }

  async countCharactersByStatus(status: string): Promise<number> {
    return this.count('Characters', 'status = ?', [status]);
  }
}

