import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  FormItem,
  Input,
  Button,
  Select,
  CustomSelect,
  CustomSelectOption,
  PanelHeaderBack,
  Snackbar,
  ScreenSpinner,
  Textarea,
  Separator,
  Header,
  Div,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  IconButton,
  Caption,
} from '@vkontakte/vkui';
import { Icon24Cancel } from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, ReactNode, useEffect } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24ErrorCircle, Icon24CheckCircleOutline, Icon24Add } from '@vkontakte/icons';
import { ContractForm } from '../components/ContractForm';
import { AttributeManager } from '../components/AttributeManager';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { InventoryManager } from '../components/InventoryManager';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { Rank } from '../components/AbilityBuilder';
import { API_URL } from '../api';
import { readJsonFile } from '../utils/anketaExport';
import ReactMarkdown from 'react-markdown';
import { ManifestationData } from '../components/ManifestationForm';
import { ShinkiAbility } from '../components/ShinkiAbilityForm';
import { getMaxContractsForRank, validateContractCount } from '../utils/contractValidation';
import { HandbookTooltip } from '../components/HandbookTooltip';
import { HANDBOOK_TOOLTIPS } from '../utils/handbookHelpers';

export interface AnketaProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: string;
    image_url?: string[];
    aura_cells?: {
        small: number;
        significant: number;
        ultimate: number;
    };
    abilities?: ShinkiAbility[];
}

interface Contract {
    contract_name: string;
    creature_name: string;
    creature_rank: string;
    creature_spectrum: string;
    creature_description: string;
    gift: string;
    sync_level: number;
    unity_stage: string;
    abilities: any[];
    creature_images?: string[];
    manifestation?: ManifestationData;
    dominion?: {
        name: string;
        environment_description: string;
        law_name: string;
        law_description: string;
        tactical_effects: string;
    };
}

interface CharacterData {
    character_name: string;
    nickname: string;
    age: string;
    rank: Rank;
    faction: string;
    faction_position: string;
    home_island: string;
    appearance: { text: string; images: string[] };
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    contracts: Contract[];
    inventory: Item[];
    currency: number;
    admin_note: string;
    character_images: string[];
    life_status: 'Жив' | 'Мёртв';
}


const emptyContract: Contract = {
  contract_name: '',
  creature_name: '',
  creature_rank: '',
  creature_spectrum: '',
  creature_description: '',
  gift: '',
  sync_level: 0,
  unity_stage: 'Ступень I - Активация',
  abilities: [],
  manifestation: {
    modus: '',
    avatar_description: '',
    passive_enhancement: '',
    ultimate_technique: ''
  },
  dominion: {
    name: '',
    environment_description: '',
    law_name: '',
    law_description: '',
    tactical_effects: ''
  },
};

const getUnityStage = (syncLevel: number): string => {
  if (syncLevel >= 100) return 'Ступень IV - Доминион';
  if (syncLevel >= 75) return 'Ступень III - Манифестация';
  if (syncLevel >= 25) return 'Ступень II - Воплощение';
  return 'Ступень I - Активация';
};

const attributesList = [
  "Сила", "Реакция", "Ловкость", "Выносливость", "Меткость",
  "Рукопашный Бой", "Холодное Оружие", "Техника", "Восприятие", "Скрытность"
];

const initialAttributes = attributesList.reduce((acc, attr) => {
  acc[attr] = 'Дилетант';
  return acc;
}, {} as { [key: string]: string });

const getAttributePointsForRank = (rank: Rank): number => {
  switch (rank) {
    case 'F': return 10;
    case 'E': return 14;
    case 'D': return 16;
    case 'C': return 20;
    case 'B': return 30;
    case 'A': return 40;
    case 'S': return 50;
    case 'SS': return 60;
    case 'SSS': return 70;
    default: return 10;
  }
};

const getDefaultCharacterData = (): Omit<CharacterData, 'vk_id' | 'status'> => {
  return {
    character_name: '',
    nickname: '',
    age: '',
    rank: 'F',
    faction: 'Нейтрал',
    faction_position: '',
    home_island: 'Кага',
    appearance: { text: '', images: [] },
    character_images: [],
    personality: '',
    biography: '',
    archetypes: [],
    attributes: {},
    contracts: [{
      contract_name: '',
      creature_name: '',
      creature_rank: 'F',
      creature_spectrum: '',
      creature_description: '',
      gift: '',
      sync_level: 0,
      unity_stage: 'Ступень I - Активация',
      abilities: [],
    }],
    inventory: [],
    currency: 0,
    admin_note: '',
    life_status: 'Жив',
  };
};

interface FactionOption {
  label: string;
  value: string;
}

export const Anketa: FC<AnketaProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const isEditing = !!characterId;

  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [factionOptions, setFactionOptions] = useState<FactionOption[]>([
    { label: 'Порядок', value: 'Порядок' },
    { label: 'Отражённый Свет Солнца', value: 'Отражённый Свет Солнца' },
    { label: 'Чёрная Лилия', value: 'Чёрная Лилия' },
    { label: 'Нейтрал', value: 'Нейтрал' },
  ]);

  const handleImportAnketa = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const content = await readJsonFile(file);
      const importedData = JSON.parse(content as string);

      if (importedData.contracts && Array.isArray(importedData.contracts)) {
        importedData.contracts.forEach((contract: any) => {
          if (contract.manifestation && typeof contract.manifestation.modus === 'undefined') {
            contract.manifestation.modus = '';
          }
        });
      }

      const dataToSet = {
        ...formData,
        character_name: importedData.character_name,
        nickname: importedData.nickname,
        age: String(importedData.age),
        rank: importedData.rank as Rank,
        faction: importedData.faction,
        faction_position: importedData.faction_position,
        home_island: importedData.home_island,
        appearance: importedData.appearance,
        character_images: importedData.character_images,
        personality: importedData.personality,
        biography: importedData.biography,
        archetypes: importedData.archetypes,
        attributes: importedData.attributes,
        contracts: importedData.contracts,
        inventory: importedData.inventory,
        currency: importedData.currency,
        admin_note: importedData.admin_note,
        life_status: importedData.life_status
      };
      
      setFormData(dataToSet);
      
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Анкета успешно импортирована!
        </Snackbar>
      );
    } catch (error) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при импорте анкеты. Проверьте формат файла.
        </Snackbar>
      );
    }
  };

  const [formData, setFormData] = useState({
    character_name: '',
    nickname: '',
    age: '',
    rank: 'F' as Rank,
    faction: '',
    faction_position: '',
    home_island: '',
    appearance: { text: '', images: [] as string[] },
    personality: '',
    biography: '',
    archetypes: [] as string[],
    attributes: initialAttributes,
    contracts: [] as Contract[],
    inventory: [] as any[],
    currency: 0,
    admin_note: '',
    character_images: [] as string[],
    life_status: 'Жив' as 'Жив' | 'Мёртв',
  });

  useEffect(() => {
    if (isEditing) {
      setPopout(<ScreenSpinner />);
      fetch(`${API_URL}/characters/${characterId}`)
        .then(res => res.json())
        .then(data => {
          const fetchedData = { ...data, age: data.age.toString() };
          // Преобразование для обратной совместимости
          if (typeof fetchedData.appearance === 'string') {
            fetchedData.appearance = { text: fetchedData.appearance, images: [] };
          }
          if (!fetchedData.appearance.images) {
            fetchedData.appearance.images = [];
          }
          setFormData(fetchedData);
          setPopout(null);
        })
        .catch(err => {
          console.error(err);
          setPopout(null);
          setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>Ошибка загрузки анкеты</Snackbar>);
        });
    }
  }, [isEditing, characterId]);

  // Загрузка фракций
  const fetchFactions = async (query = '') => {
    try {
      const response = await fetch(`${API_URL}/factions/search?q=${query}`);
      const factions = await response.json();
      const options = factions.map((f: any) => ({
        label: f.name,
        value: f.name
      }));
      setFactionOptions(options);
    } catch (error) {
      console.error('Failed to fetch factions:', error);
    }
  };

  useEffect(() => {
    fetchFactions();
  }, []);

  // Загрузка черновика из localStorage
  useEffect(() => {
    if (!isEditing) {
      const savedDraft = localStorage.getItem('anketaDraft');
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          setFormData(draftData);
        } catch (error) {
          console.error("Failed to parse anketa draft:", error);
          localStorage.removeItem('anketaDraft');
        }
      }
    }
  }, [isEditing]);

  // Сохранение черновика в localStorage
  useEffect(() => {
    if (!isEditing) {
      localStorage.setItem('anketaDraft', JSON.stringify(formData));
    }
  }, [formData, isEditing]);

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const nameParts = name.split('.');
    if (nameParts.length > 1 && nameParts[0] === 'appearance') {
        setFormData(prev => ({
            ...prev,
            appearance: {
                ...prev.appearance,
                [nameParts[1]]: value
            }
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAttributeChange = (name: string, value: string) => {
    const newAttributes = { ...formData.attributes };
    if (value === 'none') {
      delete newAttributes[name];
    } else {
      newAttributes[name] = value;
    }
    setFormData(prev => ({ ...prev, attributes: newAttributes }));
  };

  const handleArchetypeChange = (archetype: string, isSelected: boolean) => {
    setFormData(prev => ({
      ...prev,
      archetypes: isSelected
        ? [...prev.archetypes, archetype]
        : prev.archetypes.filter(a => a !== archetype)
    }));
  };

  const handleContractChange = (index: number, fieldOrObject: string | Partial<Contract>, value?: any) => {
    const newContracts = [...formData.contracts];
    let updatedContract = { ...newContracts[index] };

    if (typeof fieldOrObject === 'string') {
      updatedContract = { ...updatedContract, [fieldOrObject]: value };
      if (fieldOrObject === 'sync_level') {
        updatedContract.unity_stage = getUnityStage(Number(value));
      }
    } else {
      updatedContract = { ...updatedContract, ...fieldOrObject };
      if (fieldOrObject.sync_level !== undefined) {
        updatedContract.unity_stage = getUnityStage(fieldOrObject.sync_level);
      }
    }

    newContracts[index] = updatedContract;
    setFormData(prev => ({ ...prev, contracts: newContracts }));
  };

  const addContract = () => {
    const validation = validateContractCount(formData.rank, formData.contracts.length + 1);
    if (!validation.valid) {
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >
          {validation.message}
        </Snackbar>
      );
      return;
    }
    setFormData(prev => ({ ...prev, contracts: [...prev.contracts, { ...emptyContract }] }));
  };

  const removeContract = (index: number) => {
    if (formData.contracts.length <= 1) return;
    const newContracts = formData.contracts.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, contracts: newContracts }));
  };

  const handleCharacterImageChange = (index: number, value: string) => {
    const newImages = [...formData.character_images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, character_images: newImages }));
  };

  const addCharacterImage = () => {
    setFormData(prev => ({ ...prev, character_images: [...prev.character_images, ''] }));
  };

  const removeCharacterImage = (index: number) => {
    const newImages = formData.character_images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, character_images: newImages }));
  };

  const handleShowHistory = async () => {
    if (!characterId) return;
    setPopout(<ScreenSpinner />);
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/ai-analysis`);
      const data = await response.json();
      // Здесь нужна логика отображения модального окна.
      // Так как Anketa не имеет setModal, я пока выведу в консоль.
      console.log(data);
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>История проверок в консоли</Snackbar>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка загрузки истории: ${message}`}</Snackbar>);
    } finally {
      setPopout(null);
    }
  };
 
   const [activeModal, setActiveModal] = useState<string | null>(null);
   const [aiResult] = useState<string>('');
 
  //  const pollTaskResult = (taskId: string) => {
  //    const interval = setInterval(async () => {
  //      try {
  //        const response = await fetch(`${AI_API_URL}/tasks/${taskId}`);
  //        const data = await response.json();
 
  //        if (data.status === 'completed') {
  //          clearInterval(interval);
  //          setPopout(null);
  //          setAiResult(data.result);
  //          setActiveModal("ai-result");
  //        } else if (data.status === 'error') {
  //          clearInterval(interval);
  //          setPopout(null);
  //          throw new Error(data.detail || 'AI check failed');
  //        }
  //      } catch (error) {
  //        clearInterval(interval);
  //        setPopout(null);
  //        const message = error instanceof Error ? error.message : 'Unknown error';
  //        setSnackbar(<Snackbar
  //          onClose={() => setSnackbar(null)}
  //          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
  //        >{`Ошибка проверки ИИ: ${message}`}</Snackbar>);
  //      }
  //    }, 8000);
 
  //    setTimeout(() => {
  //      clearInterval(interval);
  //      if (popout) {
  //        setPopout(null);
  //        setSnackbar(<Snackbar
  //          onClose={() => setSnackbar(null)}
  //          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
  //        >Проверка ИИ заняла слишком много времени.</Snackbar>);
  //      }
  //    }, 120000); // 2 minutes timeout
  //  };
 
  //  const handleAICheck = async () => {
  //    setPopout(<ScreenSpinner />);
  //    setSnackbar(<Snackbar
  //      onClose={() => setSnackbar(null)}
  //    >Проверка ИИ запущена...</Snackbar>);
 
  //    try {
  //      const payload = {
  //        ...formData,
  //        age: parseInt(formData.age, 10) || 0,
  //      };
 
  //      const response = await fetch(`${AI_API_URL}/validate`, {
  //        method: 'POST',
  //        headers: { 'Content-Type': 'application/json' },
  //        body: JSON.stringify({
  //          character_data: payload,
  //          vk_id: fetchedUser?.id || 0,
  //          admin_id: localStorage.getItem('adminId') || '',
  //        }),
  //      });
 
  //      if (response.status !== 200) {
  //        const errorText = await response.text();
  //        try {
  //            const errorJson = JSON.parse(errorText);
  //            throw new Error(errorJson.detail || 'Failed to start AI check');
  //        } catch (e) {
  //            throw new Error(errorText || 'Failed to start AI check');
  //        }
  //      }
 
  //      const data = await response.json();
  //      pollTaskResult(data.task_id);
 
  //    } catch (error) {
  //      setPopout(null);
  //      const message = error instanceof Error ? error.message : 'Unknown error';
  //      setSnackbar(<Snackbar
  //        onClose={() => setSnackbar(null)}
  //        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
  //      >{`Ошибка запуска проверки ИИ: ${message}`}</Snackbar>);
  //    }
  //  };
 
   const handleSubmit = async () => {
     // Создаем локальную копию ошибок для немедленного использования
     const errors: { [key: string]: string } = {};
     const requiredFields: (keyof typeof formData)[] = [
       'character_name', 'age', 'faction', 'rank', 'faction_position', 'home_island'
     ];

     // Проверка обязательных полей
     requiredFields.forEach(field => {
       const value = formData[field];
       if (value === null || value === undefined || String(value).trim() === '') {
         errors[field] = 'Это поле обязательно для заполнения';
       }
     });

    // Проверка лимита очков атрибутов
    if (formData.attributes) {
      const attributeCosts: { [key: string]: number } = {
        "Дилетант": 1, "Новичок": 2, "Опытный": 4, "Эксперт": 7, "Мастер": 10
      };
      
      const spentPoints = Object.values(formData.attributes).reduce((acc, level) => acc + (attributeCosts[level as string] || 0), 0);
      const totalPoints = getAttributePointsForRank(formData.rank);
      
      if (spentPoints > totalPoints) {
        errors.attributes = `Превышен лимит очков атрибутов! Потрачено: ${spentPoints}, доступно: ${totalPoints}`;
      }
    }

    // Проверка лимита контрактов
    const contractValidation = validateContractCount(formData.rank, formData.contracts.length);
    if (!contractValidation.valid) {
      errors.contracts = contractValidation.message || 'Превышен лимит контрактов';
    }

    // Проверка контрактов (только если они есть)
     if (formData.contracts && formData.contracts.length > 0) {
       formData.contracts.forEach((contract, contractIndex) => {
         // Проверка обязательных полей контракта только если контракт не пустой
         const hasAnyContractData = contract.contract_name?.trim() || 
                                   contract.creature_name?.trim() || 
                                   contract.creature_spectrum?.trim() || 
                                   contract.creature_description?.trim() || 
                                   contract.gift?.trim();
         
         if (hasAnyContractData) {
           if (!contract.contract_name?.trim()) {
             errors[`contract_${contractIndex}_name`] = 'Название контракта обязательно';
           }
           if (!contract.creature_name?.trim()) {
             errors[`contract_${contractIndex}_creature_name`] = 'Имя существа обязательно';
           }
           if (!contract.creature_spectrum?.trim()) {
             errors[`contract_${contractIndex}_creature_spectrum`] = 'Спектр существа обязателен';
           }
           if (!contract.creature_description?.trim()) {
             errors[`contract_${contractIndex}_creature_description`] = 'Описание существа обязательно';
           }
           if (!contract.gift?.trim()) {
             errors[`contract_${contractIndex}_gift`] = 'Дар существа обязателен';
           }
         }

         // Проверка способностей контракта
         if (contract.abilities && contract.abilities.length > 0) {
           contract.abilities.forEach((ability, abilityIndex) => {
             if (!ability.name?.trim()) {
               errors[`contract_${contractIndex}_ability_${abilityIndex}_name`] = 'Название способности обязательно';
             }

             // Проверка бюджета способности
             const cellSpecs: Record<string, { budget: number; maxTagRank: string }> = {
               'Нулевая': { budget: 5, maxTagRank: 'F' },
               'Малая (I)': { budget: 20, maxTagRank: 'C' },
               'Значительная (II)': { budget: 50, maxTagRank: 'A' }, 
               'Предельная (III)': { budget: 150, maxTagRank: 'SSS' },
             };

             const tagCosts: Record<string, number> = {
               'F': 1, 'E': 2, 'D': 5, 'C': 10, 'B': 20, 'A': 35, 'S': 70, 'SS': 100, 'SSS': 150
             };

             const spec = cellSpecs[ability.cell_type];
             if (spec) {
               const budget = spec.budget * ability.cell_cost;
               const spentPoints = Object.values(ability.tags || {}).reduce((acc: number, rank: unknown) => {
                 const rankStr = rank as string;
                 return acc + (tagCosts[rankStr] || 0);
               }, 0);
               
               if (spentPoints > budget) {
                 errors[`contract_${contractIndex}_ability_${abilityIndex}_budget`] = `Превышен бюджет способности! Потрачено: ${spentPoints}, доступно: ${budget}`;
               }
             }

             // Проверка обязательных тегов для способностей призыва
             if (ability.is_summon) {
               const requiredTags = ['Пробивающий', 'Защитный', 'Неотвратимый', 'Область'];
               const missingTags = requiredTags.filter(tag => !ability.tags?.[tag]);
               
               if (missingTags.length > 0) {
                 errors[`contract_${contractIndex}_ability_${abilityIndex}_tags`] = `Отсутствуют обязательные теги для призыва: ${missingTags.join(', ')}`;
               }
             }
           });
         }
       });
     }

     setFormErrors(errors);
     const isValid = Object.keys(errors).length === 0;
     
     if (!isValid) {
       const errorMessages = Object.values(errors).filter(Boolean);
       const errorText = errorMessages.length > 0 
         ? `Ошибки валидации: ${errorMessages.join('; ')}`
         : 'Пожалуйста, заполните все обязательные поля.';
       setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>{errorText}</Snackbar>);
       return;
     }

    if (!fetchedUser && !isEditing) {
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>Не удалось получить данные пользователя.</Snackbar>);
      return;
    }

    setPopout(<ScreenSpinner />);

    const payload = {
      ...formData,
      vk_id: isEditing ? undefined : fetchedUser?.id,
      age: parseInt(formData.age, 10) || 0,
    };

    const url = isEditing ? `${API_URL}/characters/${characterId}` : `${API_URL}/characters`;
    const method = isEditing ? 'PUT' : 'POST';
    const adminId = localStorage.getItem('adminId');

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(isEditing && adminId && { 'x-admin-id': adminId }) },
        body: JSON.stringify(payload),
      });

      setPopout(null);
      const result = await response.json();

      if (response.ok) {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24CheckCircleOutline />}>{isEditing ? 'Анкета обновлена!' : `Анкета создана! ID: ${result.characterId}`}</Snackbar>);
        if (!isEditing) {
          localStorage.removeItem('anketaDraft');
        }
        routeNavigator.push(isEditing ? `/admin_panel` : '/');
      } else {
        const errorData = result.error || 'Неизвестная ошибка сервера';
        const missingFields = result.missing ? ` (${result.missing.join(', ')})` : '';
        throw new Error(`${errorData}${missingFields}`);
      }
    } catch (error) {
      setPopout(null);
      const errorMessage = error instanceof Error ? error.message : 'Сетевая ошибка';
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>{errorMessage}</Snackbar>);
    }
  };

  const handleClearForm = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю анкету? Все несохраненные данные будут потеряны.')) {
      setFormData(getDefaultCharacterData());
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        {isEditing ? 'Редактирование анкеты' : 'Создание анкеты'}
      </PanelHeader>

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="ai-result"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Результат проверки ИИ</ModalPageHeader>}
        >
          <Div>
            <ReactMarkdown>{aiResult}</ReactMarkdown>
          </Div>
        </ModalPage>
      </ModalRoot>
      
      <Group header={<Header>I. ОБЩАЯ ИНФОРМАЦИЯ</Header>}>
        <FormItem 
          top={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              Имя и Фамилия
              <HandbookTooltip
                tooltipText={HANDBOOK_TOOLTIPS.characterName.text}
                handbookSection={HANDBOOK_TOOLTIPS.characterName.section}
              />
            </div>
          }
          status={formErrors.character_name ? 'error' : 'default'} 
          bottom={formErrors.character_name}
        >
          <Input name="character_name" value={formData.character_name} onChange={handleChange} />
        </FormItem>
        <FormItem top={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            Ранг Проводника
            <HandbookTooltip
              tooltipText={HANDBOOK_TOOLTIPS.rank.text}
              handbookSection={HANDBOOK_TOOLTIPS.rank.section}
            />
          </div>
        }>
          <Select
            name="rank"
            value={formData.rank}
            onChange={handleChange}
            options={isEditing ? [
              { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
              { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
              { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
            ] : [
              { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
              { label: 'C', value: 'C' }, { label: 'B', value: 'B' }
            ]}
          />
        </FormItem>
        <FormItem top="Прозвище/Позывной">
          <Input name="nickname" value={formData.nickname} onChange={handleChange} />
        </FormItem>
        <FormItem top="Возраст" status={formErrors.age ? 'error' : 'default'} bottom={formErrors.age}>
          <Input name="age" type="number" value={formData.age} onChange={handleChange} />
        </FormItem>
        <FormItem 
          top={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              Фракция
              <HandbookTooltip
                tooltipText={HANDBOOK_TOOLTIPS.faction.text}
                handbookSection={HANDBOOK_TOOLTIPS.faction.section}
              />
            </div>
          }
          status={formErrors.faction ? 'error' : 'default'} 
          bottom={formErrors.faction}
        >
          <CustomSelect
            placeholder="Выберите или начните вводить название"
            options={factionOptions}
            value={formData.faction}
            searchable
            onInputChange={(e) => {
              const query = e.target.value;
              fetchFactions(query);
            }}
            onChange={(e) => handleChange({
              target: {
                name: 'faction',
                value: e.target.value
              }
            } as any)}
            renderOption={({ option, ...restProps }) => (
              <CustomSelectOption {...restProps} />
            )}
          />
        </FormItem>
        <FormItem top="Позиция во фракции" status={formErrors.faction_position ? 'error' : 'default'} bottom={formErrors.faction_position}>
          <Input name="faction_position" value={formData.faction_position} onChange={handleChange} />
        </FormItem>
        <FormItem 
          top={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              Родной остров
              <HandbookTooltip
                tooltipText={HANDBOOK_TOOLTIPS.homeIsland.text}
                handbookSection={HANDBOOK_TOOLTIPS.homeIsland.section}
              />
            </div>
          }
          status={formErrors.home_island ? 'error' : 'default'} 
          bottom={formErrors.home_island}
        >
          <Select
            name="home_island"
            placeholder="Выберите родной остров"
            value={formData.home_island}
            onChange={handleChange}
            options={[
              { label: 'Кага', value: 'Кага' }, { label: 'Хоши', value: 'Хоши' },
              { label: 'Ичи', value: 'Ичи' }, { label: 'Куро', value: 'Куро' },
              { label: 'Мидзу', value: 'Мидзу' }, { label: 'Сора', value: 'Сора' },
            ]}
          />
        </FormItem>
      </Group>

      <Group header={<Header>II. ЛИЧНОСТЬ И ВНЕШНОСТЬ</Header>}>
        <FormItem top="Внешность (описание)">
          <Textarea name="appearance.text" value={formData.appearance.text} onChange={handleChange} />
        </FormItem>
        <FormItem top="Ссылки на внешность">
          {formData.character_images.map((img, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Input
                value={img}
                onChange={(e) => handleCharacterImageChange(index, e.target.value)}
                style={{ marginRight: '8px' }}
                placeholder="https://example.com/image.png"
              />
              <IconButton onClick={() => removeCharacterImage(index)} aria-label="Удалить ссылку">
                <Icon24Cancel />
              </IconButton>
            </div>
          ))}
          <Button onClick={addCharacterImage} before={<Icon24Add />}>
            Добавить ссылку на внешность
          </Button>
        </FormItem>
        <FormItem top="Характер">
          <Textarea name="personality" value={formData.personality} onChange={handleChange} />
        </FormItem>
        <FormItem top="Биография">
          <Textarea name="biography" value={formData.biography} onChange={handleChange} />
        </FormItem>
      </Group>

      <Group header={<Header>III. БОЕВЫЕ ХАРАКТЕРИСТИКИ</Header>}>
        <ArchetypeSelector
          selectedArchetypes={formData.archetypes}
          onArchetypeChange={handleArchetypeChange}
        />
        <AttributeManager
          attributes={formData.attributes}
          onAttributeChange={handleAttributeChange}
          totalPoints={getAttributePointsForRank(formData.rank)}
        />
        {formErrors.attributes && (
          <FormItem>
            <Caption level="1" style={{ color: 'var(--vkui--color_text_negative)', display: 'block' }}>
              {formErrors.attributes}
            </Caption>
          </FormItem>
        )}
        <AuraCellsCalculator
          contracts={formData.contracts}
          currentRank={formData.rank}
        />
      </Group>

      <Group header={<Header>IV. КОНТРАКТ(Ы)</Header>}>
        {formData.contracts.map((contract, index) => (
          <Div key={index}>
            {index > 0 && <Separator style={{ marginBottom: '12px' }} />}
            <ContractForm
              contract={contract}
              index={index}
              onChange={handleContractChange}
              onRemove={removeContract}
              characterRank={formData.rank}
              fullCharacterData={formData}
            />
            {/* Отображение ошибок валидации для контракта */}
            {Object.keys(formErrors).filter(key => key.startsWith(`contract_${index}_`)).map(errorKey => (
              <FormItem key={errorKey}>
                <Caption level="1" style={{ color: 'var(--vkui--color_text_negative)', display: 'block' }}>
                  {formErrors[errorKey]}
                </Caption>
              </FormItem>
            ))}
          </Div>
        ))}
        <FormItem>
          <Button 
            onClick={addContract} 
            before={<Icon24Add />}
            disabled={formData.contracts.length >= getMaxContractsForRank(formData.rank)}
          >
            Добавить контракт
          </Button>
          <Caption level="1" style={{ marginTop: '8px', display: 'block' }}>
            Контракты: {formData.contracts.length}/{getMaxContractsForRank(formData.rank)}
          </Caption>
        </FormItem>
      </Group>

      <InventoryManager
        inventory={formData.inventory}
        onInventoryChange={(newInventory) => setFormData(prev => ({ ...prev, inventory: newInventory}))}
        characterRank={formData.rank}
      />
      <Group>
         <FormItem top="Валюта (Кредиты ₭)">
          <Input name="currency" type="number" value={formData.currency} onChange={handleChange} />
        </FormItem>
      </Group>

      <Group header={<Header>VI. ПРИМЕЧАНИЕ ДЛЯ АДМИНИСТРАЦИИ</Header>}>
        <FormItem>
          <Textarea name="admin_note" value={formData.admin_note} onChange={handleChange} />
        </FormItem>
      </Group>

      <Div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Button 
            size="l" 
            mode="outline" 
            style={{ width: '100%' }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = handleImportAnketa;
              input.click();
            }}
          >
            📥 Импорт анкеты
          </Button>
          <Button 
            size="l" 
            mode="secondary"
            appearance="negative"
            style={{ width: '100%' }}
            onClick={handleClearForm}
          >
            Очистить
          </Button>
        </div>
        <Button size="l" stretched onClick={handleSubmit}>
          {isEditing ? 'Сохранить изменения' : 'Отправить анкету'}
        </Button>
        {isEditing && (
          <Button size="l" stretched mode="secondary" onClick={handleShowHistory} style={{ marginTop: '10px' }}>
            История проверок ИИ
          </Button>
        )}
      </Div>

      {snackbar}
      {popout}
    </Panel>
  );
};