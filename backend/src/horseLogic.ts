// Логика скачек с предопределенными лошадьми

export interface Horse {
  id: number;
  name: string;
  emoji: string;
  baseSpeed: number; // 1-10, базовая скорость
  baseStamina: number; // 1-10, базовая выносливость
  baseLuck: number; // 1-10, базовая удача
  description: string;
}

export interface HorseStats {
  horse_id: number;
  total_races: number;
  wins: number;
  second_places: number;
  third_places: number;
  total_earnings: number;
}

export interface RaceResult {
  position: number;
  horse: Horse;
  finalTime: number;
  earnings: number;
}

// Предопределенный пул всех лошадей
export const ALL_HORSES: Horse[] = [
  {
    id: 1,
    name: "Николай Гоголь",
    emoji: "📖",
    baseSpeed: 7,
    baseStamina: 8,
    baseLuck: 6,
    description: "Мертвые души летят к финишу"
  },
  {
    id: 2,
    name: "Джон Умасумэ",
    emoji: "🎌",
    baseSpeed: 9,
    baseStamina: 5,
    baseLuck: 8,
    description: "Модуль скорости превыше всего"
  },
  {
    id: 3,
    name: "Альтаир Тасмухамбетов",
    emoji: "🦅",
    baseSpeed: 8,
    baseStamina: 7,
    baseLuck: 7,
    description: "Пропаганда Лососей"
  },
  {
    id: 4,
    name: "Артём Выдра",
    emoji: "🦦",
    baseSpeed: 6,
    baseStamina: 9,
    baseLuck: 5,
    description: "Его луная походка - ахуй."
  },
  {
    id: 5,
    name: "Владимир Путин",
    emoji: "🐻",
    baseSpeed: 8,
    baseStamina: 8,
    baseLuck: 9,
    description: "Крым наш, и победа тоже"
  },
  {
    id: 6,
    name: "Илон Маск",
    emoji: "🚀",
    baseSpeed: 10,
    baseStamina: 4,
    baseLuck: 7,
    description: "К Марсу и обратно за 2 минуты"
  },
  {
    id: 7,
    name: "Стив Джоб",
    emoji: "🍎",
    baseSpeed: 7,
    baseStamina: 6,
    baseLuck: 8,
    description: "Инновации в каждом шаге"
  },
  {
    id: 8,
    name: "Глеб Фусигурович",
    emoji: "⚡",
    baseSpeed: 6,
    baseStamina: 7,
    baseLuck: 9,
    description: "СУКА, НА МИДУ СТОЙ, А НЕ СТАВКИ НА КОНЕЙ ДЕЛАЙ"
  },
  {
    id: 9,
    name: "Шрек",
    emoji: "👹",
    baseSpeed: 5,
    baseStamina: 20,
    baseLuck: 6,
    description: "Медленно, но верно "
  },
  {
    id: 10,
    name: "Чак Норрис",
    emoji: "👊",
    baseSpeed: 9,
    baseStamina: 9,
    baseLuck: 10,
    description: "Не бежит - дистанция приходит к нему"
  },
  {
    id: 11,
    name: "Дональд Трамп",
    emoji: "🧡",
    baseSpeed: 6,
    baseStamina: 5,
    baseLuck: 8,
    description: "Сделаем скачки снова великими"
  },
  {
    id: 12,
    name: "Пикачу",
    emoji: "⚡",
    baseSpeed: 9,
    baseStamina: 6,
    baseLuck: 8,
    description: "Пика-пика"
  },
  {
    id: 13,
    name: "Соник Ёжиков",
    emoji: "💙",
    baseSpeed: 10,
    baseStamina: 5,
    baseLuck: 6,
    description: "Gotta go fast!"
  }
];

// Генерация случайной команды лошадей для гонки (3-6 лошадей)
export function generateRandomHorseTeam(): Horse[] {
  const teamSize = Math.floor(Math.random() * 4) + 3; // 3-6 лошадей
  const shuffled = [...ALL_HORSES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, teamSize);
}

// Симуляция гонки с учетом статов
export function simulateRace(horses: Horse[]): RaceResult[] {
  const results: RaceResult[] = [];
  
  for (const horse of horses) {
    // Добавляем случайность к базовым статам (±20%)
    const speedVariation = (Math.random() - 0.5) * 0.4 + 1; // 0.8 - 1.2
    const staminaVariation = (Math.random() - 0.5) * 0.4 + 1;
    const luckVariation = (Math.random() - 0.5) * 0.4 + 1;
    
    const effectiveSpeed = horse.baseSpeed * speedVariation;
    const effectiveStamina = horse.baseStamina * staminaVariation;
    const effectiveLuck = horse.baseLuck * luckVariation;
    
    // Рассчитываем финальное время (меньше = лучше)
    const baseTime = 60; // базовое время в секундах
    const speedBonus = (effectiveSpeed - 5) * 2; // ±10 секунд
    const staminaBonus = (effectiveStamina - 5) * 1; // ±5 секунд  
    const luckBonus = (effectiveLuck - 5) * 1.5; // ±7.5 секунд
    
    // Добавляем элемент случайности
    const randomFactor = (Math.random() - 0.5) * 10; // ±5 секунд
    
    const finalTime = Math.max(30, baseTime - speedBonus - staminaBonus - luckBonus + randomFactor);
    
    results.push({
      position: 0, // будет установлена после сортировки
      horse,
      finalTime,
      earnings: 0 // будет рассчитана после определения позиций
    });
  }
  
  // Сортируем по времени и определяем позиции
  results.sort((a, b) => a.finalTime - b.finalTime);
  
  // Устанавливаем позиции и выигрыши
  results.forEach((result, index) => {
    result.position = index + 1;
    
    // Выигрыши зависят от позиции
    switch (result.position) {
      case 1: result.earnings = 1000; break; // 1 место
      case 2: result.earnings = 500; break;  // 2 место
      case 3: result.earnings = 250; break;  // 3 место
      default: result.earnings = 0; break;   // остальные
    }
  });
  
  return results;
}

// Получение коэффициентов для ставок на основе статов
export function calculateOdds(horses: Horse[]): { [horseId: number]: number } {
  const odds: { [horseId: number]: number } = {};
  
  // Рассчитываем общий рейтинг каждой лошади
  const ratings = horses.map(horse => ({
    id: horse.id,
    rating: horse.baseSpeed + horse.baseStamina + horse.baseLuck
  }));
  
  const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
  
  // Конвертируем в коэффициенты (чем выше рейтинг, тем ниже коэффициент)
  ratings.forEach(rating => {
    const probability = rating.rating / totalRating;
    // Коэффициент = 1 / вероятность, с небольшой маржой букмекера
    odds[rating.id] = Math.max(1.1, Math.round((1 / probability) * 0.9 * 10) / 10);
  });
  
  return odds;
}

// Расчет выплат по ставкам
export function calculatePayouts(betAmount: number, betType: 'win' | 'place' | 'show', horseId: number, results: RaceResult[]): number {
  const horseResult = results.find(r => r.horse.id === horseId);
  if (!horseResult) return 0;
  
  const odds = calculateOdds(results.map(r => r.horse));
  const multiplier = odds[horseId];
  
  switch (betType) {
    case 'win':
      return horseResult.position === 1 ? betAmount * multiplier : 0;
    case 'place':
      return horseResult.position <= 2 ? betAmount * (multiplier * 0.6) : 0;
    case 'show':
      return horseResult.position <= 3 ? betAmount * (multiplier * 0.4) : 0;
    default:
      return 0;
  }
}

// Функция для обновления статистики лошадей после гонки
export async function updateHorseStats(db: any, raceResults: any[], gameId: number, totalWinnings: number) {
  for (const result of raceResults) {
    const { horse_id, position, final_time, distance_covered } = result;
    
    // Обновляем статистику лошади
    await db.run(`
      UPDATE Horses SET 
        total_races = total_races + 1,
        wins = wins + ?,
        second_places = second_places + ?,
        third_places = third_places + ?,
        total_winnings = total_winnings + ?
      WHERE id = ?
    `, [
      position === 1 ? 1 : 0,
      position === 2 ? 1 : 0, 
      position === 3 ? 1 : 0,
      position === 1 ? totalWinnings : 0,
      horse_id
    ]);
    
    // Сохраняем детальные результаты гонки
    await db.run(`
      INSERT INTO HorseRaceResults (game_id, horse_id, position, final_time, distance_covered)
      VALUES (?, ?, ?, ?, ?)
    `, [gameId, horse_id, position, final_time, distance_covered]);
  }
}
