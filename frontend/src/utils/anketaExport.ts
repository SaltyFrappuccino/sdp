// Утилиты для экспорта и импорта анкет

export interface ExportableAnketa {
  character_name: string;
  nickname: string;
  age: number;
  rank: string;
  faction: string;
  faction_position: string;
  home_island: string;
  appearance: {
    text: string;
    images: string[];
  };
  character_images: string[];
  personality: string;
  biography: string;
  archetypes: string[];
  attributes: { [key: string]: string };
  contracts: Array<{
    contract_name: string;
    creature_name: string;
    creature_rank: string;
    creature_spectrum: string;
    creature_description: string;
    creature_images: string[];
    gift: string;
    sync_level: number;
    unity_stage: string;
    abilities: any[];
    manifestation?: {
      avatar_description: string;
      passive_enhancement: string;
      ultimate_technique: string;
    };
    dominion?: {
      name: string;
      environment_description: string;
      law_name: string;
      law_description: string;
      tactical_effects: string;
    };
  }>;
  inventory: Array<{
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: string;
    image_url?: string[];
  }>;
  currency: number;
  admin_note: string;
  life_status: 'Жив' | 'Мёртв';
  exported_at: string;
  exported_by: string;
}

export const exportAnketaToJson = (character: any, userInfo?: any): string => {
  const exportData: ExportableAnketa = {
    character_name: character.character_name || '',
    nickname: character.nickname || '',
    age: character.age || 0,
    rank: character.rank || '',
    faction: character.faction || '',
    faction_position: character.faction_position || '',
    home_island: character.home_island || '',
    appearance: {
      text: character.appearance?.text || '',
      images: character.appearance?.images || []
    },
    character_images: character.character_images || [],
    personality: character.personality || '',
    biography: character.biography || '',
    archetypes: character.archetypes || [],
    attributes: character.attributes || {},
    contracts: character.contracts || [],
    inventory: character.inventory || [],
    currency: character.currency || 0,
    admin_note: character.admin_note || '',
    life_status: character.life_status || 'Жив',
    exported_at: new Date().toISOString(),
    exported_by: userInfo?.first_name || 'Unknown'
  };

  return JSON.stringify(exportData, null, 2);
};

export const downloadJsonFile = (jsonString: string, filename: string) => {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importAnketaFromJson = (jsonString: string): ExportableAnketa | null => {
  try {
    const data = JSON.parse(jsonString);
    
    // Валидация структуры
    if (!data.character_name || typeof data.character_name !== 'string') {
      throw new Error('Неверный формат файла: отсутствует имя персонажа');
    }

    // Преобразование в формат, совместимый с формой
    const importedData = {
      character_name: data.character_name || '',
      nickname: data.nickname || '',
      age: data.age || 0,
      rank: data.rank || 'F',
      faction: data.faction || '',
      faction_position: data.faction_position || '',
      home_island: data.home_island || '',
      appearance: {
        text: data.appearance?.text || '',
        images: data.appearance?.images || []
      },
      character_images: data.character_images || [],
      personality: data.personality || '',
      biography: data.biography || '',
      archetypes: data.archetypes || [],
      attributes: data.attributes || {},
      contracts: data.contracts || [],
      inventory: data.inventory || [],
      currency: data.currency || 0,
      admin_note: data.admin_note || '',
      life_status: data.life_status || 'Жив'
    };

    return importedData as ExportableAnketa;
  } catch (error) {
    console.error('Ошибка импорта анкеты:', error);
    return null;
  }
};

export const readJsonFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Не удалось прочитать файл'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
};
