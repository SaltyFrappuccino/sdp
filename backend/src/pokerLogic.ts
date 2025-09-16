// Покерная логика и утилиты для оценки рук

export interface Card {
  suit: 'h' | 'd' | 'c' | 's'; // hearts, diamonds, clubs, spades
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
}

export interface HandResult {
  type: string;
  rank: number;
  cards: Card[];
  kickers: Card[];
}

export interface Player {
  id: number;
  character_id: number;
  seat_position: number;
  chips: number;
  status: 'active' | 'folded' | 'eliminated' | 'disconnected';
  cards?: Card[];
  current_bet?: number;
  has_acted?: boolean;
}

// Создание колоды карт
export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
  const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  
  return shuffleDeck(deck);
}

// Тасовка колоды
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Получение числового значения карты для сравнения
export function getCardValue(rank: Card['rank']): number {
  switch (rank) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    case 'T': return 10;
    default: return parseInt(rank);
  }
}

// Преобразование карты в строку для хранения в БД
export function cardToString(card: Card): string {
  return card.rank + card.suit;
}

// Преобразование строки в карту
export function stringToCard(str: string): Card {
  const suit = str.slice(-1) as Card['suit'];
  const rank = str.slice(0, -1) as Card['rank'];
  return { suit, rank };
}

// Оценка покерной руки (7 карт - 2 карманные + 5 общих)
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length !== 7) {
    throw new Error('Hand evaluation requires exactly 7 cards');
  }

  const sortedCards = [...cards].sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank));
  
  // Проверяем все возможные комбинации
  const results = [
    checkRoyalFlush(sortedCards),
    checkStraightFlush(sortedCards),
    checkFourOfAKind(sortedCards),
    checkFullHouse(sortedCards),
    checkFlush(sortedCards),
    checkStraight(sortedCards),
    checkThreeOfAKind(sortedCards),
    checkTwoPair(sortedCards),
    checkPair(sortedCards),
    checkHighCard(sortedCards)
  ].filter(result => result !== null) as HandResult[];

  // Возвращаем лучшую руку
  return results.reduce((best, current) => 
    current.rank > best.rank ? current : best
  );
}

function checkRoyalFlush(cards: Card[]): HandResult | null {
  const flushSuits = getFlushSuits(cards);
  
  for (const suit of flushSuits) {
    const suitCards = cards.filter(card => card.suit === suit);
    const royalRanks = ['A', 'K', 'Q', 'J', 'T'];
    
    if (royalRanks.every(rank => suitCards.some(card => card.rank === rank))) {
      const royalCards = suitCards.filter(card => royalRanks.includes(card.rank));
      return {
        type: 'Royal Flush',
        rank: 10,
        cards: royalCards.slice(0, 5),
        kickers: []
      };
    }
  }
  
  return null;
}

function checkStraightFlush(cards: Card[]): HandResult | null {
  const flushSuits = getFlushSuits(cards);
  
  for (const suit of flushSuits) {
    const suitCards = cards.filter(card => card.suit === suit);
    const straight = getStraight(suitCards);
    
    if (straight) {
      return {
        type: 'Straight Flush',
        rank: 9,
        cards: straight,
        kickers: []
      };
    }
  }
  
  return null;
}

function checkFourOfAKind(cards: Card[]): HandResult | null {
  const rankGroups = groupByRank(cards);
  
  for (const [rank, groupCards] of Object.entries(rankGroups)) {
    if (groupCards.length >= 4) {
      const fourCards = groupCards.slice(0, 4);
      const kicker = cards.find(card => card.rank !== rank);
      
      return {
        type: 'Four of a Kind',
        rank: 8,
        cards: fourCards,
        kickers: kicker ? [kicker] : []
      };
    }
  }
  
  return null;
}

function checkFullHouse(cards: Card[]): HandResult | null {
  const rankGroups = groupByRank(cards);
  let threeOfAKind: Card[] = [];
  let pair: Card[] = [];
  
  // Ищем все тройки и пары
  const triples: Card[][] = [];
  const pairs: Card[][] = [];
  
  for (const [rank, groupCards] of Object.entries(rankGroups)) {
    if (groupCards.length >= 3) {
      triples.push(groupCards.slice(0, 3));
      // Если у нас 4 или 5 карт одного ранга, оставшиеся могут образовать пару
      if (groupCards.length >= 4) {
        pairs.push(groupCards.slice(3, 5));
      }
    } else if (groupCards.length >= 2) {
      pairs.push(groupCards.slice(0, 2));
    }
  }
  
  // Выбираем лучшую тройку (по старшинству)
  if (triples.length > 0) {
    triples.sort((a, b) => getCardValue(b[0].rank) - getCardValue(a[0].rank));
    threeOfAKind = triples[0];
    
    // Выбираем лучшую пару (исключая ранг тройки)
    const availablePairs = pairs.filter(p => p[0].rank !== threeOfAKind[0].rank);
    if (availablePairs.length > 0) {
      availablePairs.sort((a, b) => getCardValue(b[0].rank) - getCardValue(a[0].rank));
      pair = availablePairs[0];
    }
  }
  
  if (threeOfAKind.length === 3 && pair.length === 2) {
    return {
      type: 'Full House',
      rank: 7,
      cards: [...threeOfAKind, ...pair],
      kickers: []
    };
  }
  
  return null;
}

function checkFlush(cards: Card[]): HandResult | null {
  const flushSuits = getFlushSuits(cards);
  
  if (flushSuits.length > 0) {
    const flushCards = cards
      .filter(card => card.suit === flushSuits[0])
      .slice(0, 5);
    
    return {
      type: 'Flush',
      rank: 6,
      cards: flushCards,
      kickers: []
    };
  }
  
  return null;
}

function checkStraight(cards: Card[]): HandResult | null {
  const straight = getStraight(cards);
  
  if (straight) {
    return {
      type: 'Straight',
      rank: 5,
      cards: straight,
      kickers: []
    };
  }
  
  return null;
}

function checkThreeOfAKind(cards: Card[]): HandResult | null {
  const rankGroups = groupByRank(cards);
  
  for (const [rank, groupCards] of Object.entries(rankGroups)) {
    if (groupCards.length >= 3) {
      const threeCards = groupCards.slice(0, 3);
      const kickers = cards
        .filter(card => card.rank !== rank)
        .slice(0, 2);
      
      return {
        type: 'Three of a Kind',
        rank: 4,
        cards: threeCards,
        kickers
      };
    }
  }
  
  return null;
}

function checkTwoPair(cards: Card[]): HandResult | null {
  const rankGroups = groupByRank(cards);
  const pairs: Card[] = [];
  
  for (const [rank, groupCards] of Object.entries(rankGroups)) {
    if (groupCards.length >= 2 && pairs.length < 4) {
      pairs.push(...groupCards.slice(0, 2));
    }
  }
  
  if (pairs.length >= 4) {
    const usedRanks = [pairs[0].rank, pairs[2].rank];
    const kicker = cards.find(card => !usedRanks.includes(card.rank));
    
    return {
      type: 'Two Pair',
      rank: 3,
      cards: pairs.slice(0, 4),
      kickers: kicker ? [kicker] : []
    };
  }
  
  return null;
}

function checkPair(cards: Card[]): HandResult | null {
  const rankGroups = groupByRank(cards);
  
  for (const [rank, groupCards] of Object.entries(rankGroups)) {
    if (groupCards.length >= 2) {
      const pairCards = groupCards.slice(0, 2);
      const kickers = cards
        .filter(card => card.rank !== rank)
        .slice(0, 3);
      
      return {
        type: 'Pair',
        rank: 2,
        cards: pairCards,
        kickers
      };
    }
  }
  
  return null;
}

function checkHighCard(cards: Card[]): HandResult {
  return {
    type: 'High Card',
    rank: 1,
    cards: cards.slice(0, 5),
    kickers: []
  };
}

// Вспомогательные функции
function groupByRank(cards: Card[]): Record<string, Card[]> {
  const groups: Record<string, Card[]> = {};
  
  for (const card of cards) {
    if (!groups[card.rank]) {
      groups[card.rank] = [];
    }
    groups[card.rank].push(card);
  }
  
  // Сортируем группы по старшинству карт
  const sortedGroups: Record<string, Card[]> = {};
  const sortedRanks = Object.keys(groups).sort((a, b) => getCardValue(b as Card['rank']) - getCardValue(a as Card['rank']));
  
  for (const rank of sortedRanks) {
    sortedGroups[rank] = groups[rank];
  }
  
  return sortedGroups;
}

function getFlushSuits(cards: Card[]): Card['suit'][] {
  const suitCounts: Record<Card['suit'], number> = {
    h: 0,
    d: 0,
    c: 0,
    s: 0
  };
  
  for (const card of cards) {
    suitCounts[card.suit]++;
  }
  
  return Object.entries(suitCounts)
    .filter(([, count]) => count >= 5)
    .map(([suit]) => suit as Card['suit']);
}

function getStraight(cards: Card[]): Card[] | null {
  const uniqueRanks = [...new Set(cards.map(card => card.rank))];
  const sortedValues = uniqueRanks
    .map(rank => getCardValue(rank))
    .sort((a, b) => b - a);
  
  // Проверяем обычный стрит
  for (let i = 0; i <= sortedValues.length - 5; i++) {
    if (sortedValues[i] - sortedValues[i + 4] === 4) {
      const straightValues = sortedValues.slice(i, i + 5);
      return straightValues.map(value => {
        // Находим карту с нужным значением
        return cards.find(card => getCardValue(card.rank) === value)!;
      });
    }
  }
  
  // Проверяем младший стрит (A-2-3-4-5)
  const lowStraightValues = [14, 5, 4, 3, 2]; // A, 5, 4, 3, 2
  if (lowStraightValues.every(value => sortedValues.includes(value))) {
    // Возвращаем в порядке 5-4-3-2-A (туз считается как 1 в младшем стрите)
    return [5, 4, 3, 2, 14].map(value => {
      return cards.find(card => getCardValue(card.rank) === value)!;
    });
  }
  
  return null;
}

// Сравнение двух рук для определения победителя
export function compareHands(hand1: HandResult, hand2: HandResult): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  
  // Если ранги одинаковые, сравниваем по старшинству карт
  for (let i = 0; i < Math.max(hand1.cards.length, hand2.cards.length); i++) {
    const card1Value = hand1.cards[i] ? getCardValue(hand1.cards[i].rank) : 0;
    const card2Value = hand2.cards[i] ? getCardValue(hand2.cards[i].rank) : 0;
    
    if (card1Value !== card2Value) {
      return card1Value - card2Value;
    }
  }
  
  // Сравниваем кикеры
  for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
    const kicker1Value = hand1.kickers[i] ? getCardValue(hand1.kickers[i].rank) : 0;
    const kicker2Value = hand2.kickers[i] ? getCardValue(hand2.kickers[i].rank) : 0;
    
    if (kicker1Value !== kicker2Value) {
      return kicker1Value - kicker2Value;
    }
  }
  
  return 0; // Руки равны
}

// Определение следующего игрока в очереди
export function getNextActivePlayer(players: Player[], currentPosition: number): Player | null {
  const activePlayers = players.filter(p => p.status === 'active');
  
  if (activePlayers.length <= 1) {
    return null;
  }
  
  // Сортируем игроков по позиции
  const sortedActivePlayers = activePlayers.sort((a, b) => a.seat_position - b.seat_position);
  
  // Находим текущего игрока
  const currentIndex = sortedActivePlayers.findIndex(p => p.seat_position === currentPosition);
  
  if (currentIndex === -1) {
    // Если текущий игрок не найден, возвращаем первого активного
    return sortedActivePlayers[0];
  }
  
  // Возвращаем следующего игрока по кругу
  const nextIndex = (currentIndex + 1) % sortedActivePlayers.length;
  return sortedActivePlayers[nextIndex];
}

// Расчет размера банка и side-pot'ов
export function calculatePots(players: Player[]): Array<{amount: number, eligiblePlayers: number[]}> {
  const bets = players
    .filter(p => p.current_bet && p.current_bet > 0)
    .map(p => ({ player_id: p.id, amount: p.current_bet! }))
    .sort((a, b) => a.amount - b.amount);
  
  if (bets.length === 0) {
    return [];
  }
  
  const pots: Array<{amount: number, eligiblePlayers: number[]}> = [];
  let previousBet = 0;
  
  // Группируем игроков по размеру ставки для правильного расчета side-pot'ов
  const uniqueAmounts = [...new Set(bets.map(b => b.amount))];
  
  for (let i = 0; i < uniqueAmounts.length; i++) {
    const currentAmount = uniqueAmounts[i];
    const betDifference = currentAmount - previousBet;
    
    // Игроки, которые поставили хотя бы currentAmount
    const eligiblePlayers = bets
      .filter(b => b.amount >= currentAmount)
      .map(b => b.player_id);
    
    const potAmount = betDifference * eligiblePlayers.length;
    
    if (potAmount > 0) {
      pots.push({ amount: potAmount, eligiblePlayers });
    }
    
    previousBet = currentAmount;
  }
  
  return pots;
}
