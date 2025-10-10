// Admin service for administrative operations

import { CharacterRepository } from '../repositories/character.repository.js';
import { CharacterService } from './character.service.js';
import { NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { validateAdminById } from '../utils/validators.js';

export class AdminService {
  private characterRepo: CharacterRepository;
  private characterService: CharacterService;

  constructor() {
    this.characterRepo = new CharacterRepository();
    this.characterService = new CharacterService();
  }

  async approveCharacter(adminId: string | undefined, characterId: number): Promise<{ message: string }> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    await this.characterService.updateCharacterStatus(characterId, 'Принято');
    return { message: 'Персонаж одобрен' };
  }

  async rejectCharacter(adminId: string | undefined, characterId: number): Promise<{ message: string }> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    await this.characterService.updateCharacterStatus(characterId, 'Отклонено');
    return { message: 'Персонаж отклонён' };
  }

  async getPendingCharacters(adminId: string | undefined): Promise<any[]> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    return this.characterService.getCharactersByStatus('На рассмотрении');
  }

  // Updates management
  async getAllUpdates(adminId: string | undefined): Promise<any[]> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    const updates = await this.characterRepo.findAllUpdates();
    return updates.map(u => ({
      ...u,
      updated_data: this.parseJSON(u.updated_data),
    }));
  }

  async getUpdateById(adminId: string | undefined, updateId: number): Promise<any> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    const update = await this.characterRepo.findUpdateById(updateId);
    if (!update) {
      throw new NotFoundError('Обновление не найдено');
    }

    // Get original character data
    const character = await this.characterRepo.findCharacterById(update.character_id);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const contracts = await this.characterRepo.findContractsByCharacterId(update.character_id);

    return {
      update: {
        ...update,
        updated_data: this.parseJSON(update.updated_data),
      },
      original_character: this.parseCharacter(character, contracts),
    };
  }

  async approveUpdate(adminId: string | undefined, updateId: number): Promise<{ message: string }> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    const update = await this.characterRepo.findUpdateById(updateId);
    if (!update) {
      throw new NotFoundError('Обновление не найдено');
    }

    if (update.status !== 'pending') {
      throw new Error('Обновление уже обработано');
    }

    const updatedData = this.parseJSON(update.updated_data);
    
    // Apply the update to the character
    await this.characterService.updateCharacter(update.character_id, updatedData);

    // Mark update as approved
    await this.characterRepo.updateUpdateStatus(updateId, 'approved');

    return { message: 'Изменение принято и применено' };
  }

  async rejectUpdate(adminId: string | undefined, updateId: number): Promise<{ message: string }> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    const update = await this.characterRepo.findUpdateById(updateId);
    if (!update) {
      throw new NotFoundError('Обновление не найдено');
    }

    if (update.status !== 'pending') {
      throw new Error('Обновление уже обработано');
    }

    await this.characterRepo.updateUpdateStatus(updateId, 'rejected');

    return { message: 'Изменение отклонено' };
  }

  async deleteUpdate(adminId: string | undefined, updateId: number): Promise<{ message: string }> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    const update = await this.characterRepo.findUpdateById(updateId);
    if (!update) {
      throw new NotFoundError('Обновление не найдено');
    }

    await this.characterRepo.deleteUpdate(updateId);

    return { message: 'Обновление удалено' };
  }

  // Stats
  async getStats(adminId: string | undefined): Promise<any> {
    if (!validateAdminById(adminId)) {
      throw new UnauthorizedError('Требуются права администратора');
    }

    const totalCharacters = await this.characterRepo.countCharacters();
    const pendingCharacters = await this.characterRepo.countCharactersByStatus('На рассмотрении');
    const approvedCharacters = await this.characterRepo.countCharactersByStatus('Принято');
    const rejectedCharacters = await this.characterRepo.countCharactersByStatus('Отклонено');

    return {
      total_characters: totalCharacters,
      pending_characters: pendingCharacters,
      approved_characters: approvedCharacters,
      rejected_characters: rejectedCharacters,
    };
  }

  // Helper methods
  private parseCharacter(character: any, contracts: any[]): any {
    return {
      ...character,
      appearance: this.parseJSON(character.appearance),
      character_images: this.parseJSON(character.character_images),
      archetypes: this.parseJSON(character.archetypes),
      attributes: this.parseJSON(character.attributes),
      aura_cells: this.parseJSON(character.aura_cells),
      inventory: this.parseJSON(character.inventory),
      contracts: contracts.map(c => ({
        ...c,
        creature_images: this.parseJSON(c.creature_images),
        abilities: this.parseJSON(c.abilities),
        manifestation: this.parseJSON(c.manifestation),
        dominion: this.parseJSON(c.dominion),
      })),
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

