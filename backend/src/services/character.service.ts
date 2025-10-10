// Character service with business logic

import { CharacterRepository } from '../repositories/character.repository.js';
import { Character, Contract } from '../types/index.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { validateRequiredFields } from '../utils/validators.js';
import { getAttributePointsForRank, calculateAuraCells } from '../utils/calculations.js';

export class CharacterService {
  private characterRepo: CharacterRepository;

  constructor() {
    this.characterRepo = new CharacterRepository();
  }

  async getAllCharacters(): Promise<any[]> {
    const characters = await this.characterRepo.findAllCharacters();
    return this.parseCharacters(characters);
  }

  async getCharacterById(id: number): Promise<any> {
    const character = await this.characterRepo.findCharacterById(id);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const contracts = await this.characterRepo.findContractsByCharacterId(id);
    return this.parseCharacter(character, contracts);
  }

  async getCharactersByVkId(vkId: number): Promise<any[]> {
    const characters = await this.characterRepo.findCharacterByVkId(vkId);
    const parsed = [];

    for (const character of characters) {
      const contracts = await this.characterRepo.findContractsByCharacterId(character.id);
      parsed.push(this.parseCharacter(character, contracts));
    }

    return parsed;
  }

  async getCharactersByStatus(status: string): Promise<any[]> {
    const characters = await this.characterRepo.findCharactersByStatus(status);
    return this.parseCharacters(characters);
  }

  async createCharacter(data: any): Promise<{ characterId: number, message: string }> {
    const { contracts = [], ...character } = data;

    // Validate required fields
    const requiredFields = ['vk_id', 'character_name', 'age', 'faction', 'rank', 'faction_position', 'home_island'];
    validateRequiredFields(character, requiredFields);

    // Set defaults
    if (character.currency === undefined || character.currency === null) {
      character.currency = 0;
    }
    if (!character.status) {
      character.status = 'На рассмотрении';
    }

    // Calculate attribute points
    character.attribute_points_total = getAttributePointsForRank(character.rank);
    
    if (character.attributes) {
      const attributeSum = Object.values(character.attributes as any).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
      character.attribute_points_spent = attributeSum;
    } else {
      character.attribute_points_spent = 0;
    }

    // Calculate aura cells
    character.aura_cells = calculateAuraCells(character.rank, contracts);

    // Create character
    const characterId = await this.characterRepo.createCharacter(character);

    // Create contracts
    for (const contract of contracts) {
      await this.characterRepo.createContract({
        ...contract,
        character_id: characterId,
      });
    }

    return { characterId, message: 'Персонаж успешно создан' };
  }

  async updateCharacter(id: number, data: any): Promise<{ message: string }> {
    const existing = await this.characterRepo.findCharacterById(id);
    if (!existing) {
      throw new NotFoundError('Персонаж не найден');
    }

    // Update aura cells if rank or contracts changed
    if (data.rank || data.contracts !== undefined) {
      const currentContracts = await this.characterRepo.findContractsByCharacterId(id);
      const rank = data.rank || existing.rank;
      const contracts = data.contracts || currentContracts;
      data.aura_cells = calculateAuraCells(rank, contracts);
    }

    // Update attribute points if rank changed
    if (data.rank) {
      data.attribute_points_total = getAttributePointsForRank(data.rank);
    }

    // Update character
    await this.characterRepo.updateCharacter(id, data);

    // Update contracts if provided
    if (data.contracts !== undefined) {
      await this.characterRepo.deleteContractsByCharacterId(id);
      for (const contract of data.contracts) {
        await this.characterRepo.createContract({
          ...contract,
          character_id: id,
        });
      }
    }

    return { message: 'Персонаж успешно обновлён' };
  }

  async updateCharacterStatus(id: number, status: string): Promise<{ message: string }> {
    const existing = await this.characterRepo.findCharacterById(id);
    if (!existing) {
      throw new NotFoundError('Персонаж не найден');
    }

    await this.characterRepo.updateCharacter(id, { status });
    return { message: 'Статус персонажа обновлён' };
  }

  async deleteCharacter(id: number): Promise<{ message: string }> {
    const existing = await this.characterRepo.findCharacterById(id);
    if (!existing) {
      throw new NotFoundError('Персонаж не найден');
    }

    await this.characterRepo.deleteCharacter(id);
    return { message: 'Персонаж удалён' };
  }

  async updateCurrency(characterId: number, amount: number): Promise<{ message: string, newBalance: number }> {
    const character = await this.characterRepo.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const currentCurrency = character.currency || 0;
    const newBalance = currentCurrency + amount;

    if (newBalance < 0) {
      throw new ValidationError('Недостаточно средств');
    }

    await this.characterRepo.updateCharacterCurrency(characterId, amount);
    return { message: 'Баланс обновлён', newBalance };
  }

  async searchCharacters(searchTerm: string): Promise<any[]> {
    const characters = await this.characterRepo.searchCharacters(searchTerm);
    return this.parseCharacters(characters);
  }

  async getCharactersByFaction(faction: string): Promise<any[]> {
    const characters = await this.characterRepo.findCharactersByFaction(faction);
    return this.parseCharacters(characters);
  }

  async getCharactersByRank(rank: string): Promise<any[]> {
    const characters = await this.characterRepo.findCharactersByRank(rank);
    return this.parseCharacters(characters);
  }

  // Helper methods
  private parseCharacter(character: any, contracts?: any[]): any {
    return {
      ...character,
      appearance: this.parseJSON(character.appearance),
      character_images: this.parseJSON(character.character_images),
      archetypes: this.parseJSON(character.archetypes),
      attributes: this.parseJSON(character.attributes),
      aura_cells: this.parseJSON(character.aura_cells),
      inventory: this.parseJSON(character.inventory),
      contracts: contracts ? contracts.map(c => this.parseContract(c)) : undefined,
    };
  }

  private parseCharacters(characters: any[]): any[] {
    return characters.map(c => this.parseCharacter(c));
  }

  private parseContract(contract: any): any {
    return {
      ...contract,
      creature_images: this.parseJSON(contract.creature_images),
      abilities: this.parseJSON(contract.abilities),
      manifestation: this.parseJSON(contract.manifestation),
      dominion: this.parseJSON(contract.dominion),
    };
  }

  private parseJSON(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}

