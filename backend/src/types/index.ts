// Core Types and Interfaces

export interface Contract {
  id?: number;
  character_id?: number;
  contract_name: string;
  creature_name: string;
  creature_rank: string;
  creature_spectrum: string;
  creature_description: string;
  creature_images: string[];
  gift: string;
  sync_level: number;
  unity_stage: string;
  abilities: Record<string, any>;
}

export interface Appearance {
  text: string;
  images: string[];
}

export interface Attributes {
  [key: string]: number;
}

export interface AuraCells {
  'Малые (I)': number | typeof Infinity;
  'Значительные (II)': number | typeof Infinity;
  'Предельные (III)': number;
}

export interface Character {
  id?: number;
  vk_id: number;
  status: string;
  character_name: string;
  nickname?: string;
  age: number;
  rank: string;
  faction: string;
  faction_position: string;
  home_island: string;
  appearance: Appearance;
  character_images: string[];
  personality: string;
  biography: string;
  life_status?: string;
  archetypes: string[];
  attributes: Attributes;
  attribute_points_total: number;
  attribute_points_spent: number;
  aura_cells: AuraCells;
  inventory: any[];
  currency: number;
  admin_note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Update {
  id?: number;
  character_id: number;
  status: string;
  updated_data: Partial<Character>;
  created_at?: string;
}

export type Rank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface User {
  id?: number;
  vk_id: number;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  created_at?: string;
}

// Game Types
export interface GameResult {
  id?: number;
  character_id: number;
  game_type: string;
  bet: number;
  result: number;
  created_at?: string;
}

// Market Types
export interface Stock {
  id: number;
  symbol: string;
  name: string;
  current_price: number;
  base_volatility: number;
}

export interface CryptoCurrency {
  id: number;
  name: string;
  ticker_symbol: string;
  current_price: number;
  base_volatility: number;
  total_supply: number;
  circulating_supply: number;
}

// Inventory Types
export interface InventoryItem {
  id: number;
  name: string;
  type: string;
  description?: string;
  quantity?: number;
}

// Faction Types
export interface Faction {
  id?: number;
  name: string;
  description: string;
  emoji: string;
  color: string;
}

// Bestiary Types
export interface BestiaryEntry {
  id?: number;
  name: string;
  rank: string;
  spectrum: string;
  description: string;
  images: string[];
}

