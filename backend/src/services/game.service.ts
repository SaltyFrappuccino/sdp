// Game service for casino, fishing, and hunting

import { GameRepository } from '../repositories/game.repository.js';
import { CharacterRepository } from '../repositories/character.repository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class GameService {
  private gameRepo: GameRepository;
  private characterRepo: CharacterRepository;

  constructor() {
    this.gameRepo = new GameRepository();
    this.characterRepo = new CharacterRepository();
  }

  // Casino games
  async playCasinoGame(characterId: number, gameType: string, betAmount: number, gameResult: any): Promise<any> {
    const character = await this.characterRepo.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const currency = character.currency || 0;
    if (currency < betAmount) {
      throw new ValidationError('Недостаточно средств');
    }

    // Deduct bet
    await this.characterRepo.updateCharacterCurrency(characterId, -betAmount);

    // Create game record
    const gameId = await this.gameRepo.createCasinoGame({
      character_id: characterId,
      game_type: gameType,
      bet_amount: betAmount,
      win_amount: gameResult.winAmount || 0,
      game_data: gameResult.gameData || {},
      result: gameResult.result,
    });

    // Add winnings if any
    if (gameResult.winAmount > 0) {
      await this.characterRepo.updateCharacterCurrency(characterId, gameResult.winAmount);
    }

    const newBalance = currency - betAmount + (gameResult.winAmount || 0);

    return {
      game_id: gameId,
      result: gameResult.result,
      win_amount: gameResult.winAmount || 0,
      new_balance: newBalance,
      game_data: gameResult.gameData,
    };
  }

  // Horses
  async getAllHorses(): Promise<any[]> {
    return this.gameRepo.findAllHorses();
  }

  async getHorseById(id: number): Promise<any> {
    const horse = await this.gameRepo.findHorseById(id);
    if (!horse) {
      throw new NotFoundError('Лошадь не найдена');
    }
    return horse;
  }

  // Fishing
  async getFishingLocations(): Promise<any[]> {
    return this.gameRepo.findFishingLocations();
  }

  async getFishingGear(): Promise<any[]> {
    return this.gameRepo.findFishingGear();
  }

  async getCharacterFishingGear(characterId: number): Promise<any[]> {
    return this.gameRepo.findCharacterFishingGear(characterId);
  }

  async getCharacterFishInventory(characterId: number): Promise<any[]> {
    return this.gameRepo.findCharacterFishInventory(characterId);
  }

  // Hunting
  async getHuntingLocations(): Promise<any[]> {
    return this.gameRepo.findHuntingLocations();
  }

  async getHuntingGear(): Promise<any[]> {
    return this.gameRepo.findHuntingGear();
  }

  async getCharacterHuntingGear(characterId: number): Promise<any[]> {
    return this.gameRepo.findCharacterHuntingGear(characterId);
  }

  async getCharacterHuntInventory(characterId: number): Promise<any[]> {
    return this.gameRepo.findCharacterHuntInventory(characterId);
  }
}

