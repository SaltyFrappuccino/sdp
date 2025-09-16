import {
  Panel,
  PanelHeader,
  NavIdProps,
  PanelHeaderBack,
  Snackbar,
  ScreenSpinner,
  Separator,
  Div,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, ReactNode, useEffect } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24ErrorCircle, Icon24CheckCircleOutline } from '@vkontakte/icons';
import ReactMarkdown from 'react-markdown';
import { AnketaEditor } from './AnketaEditor';
import { AI_API_URL } from '../api';
import { Rank } from '../components/AbilityBuilder';
import { API_URL } from '../api';
import { readJsonFile } from '../utils/anketaExport';
import { ManifestationData } from '../components/ManifestationForm';


interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: string;
    image_url?: string[];
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
    age: number | string;
    rank: Rank;
    faction: string;
    faction_position: string;
    home_island: string;
    appearance: {
        text: string;
    };
    character_images: string[];
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    attribute_points_total?: number;
    aura_cells?: {
      "Малые (I)": number;
      "Значительные (II)": number;
      "Предельные (III)": number;
    };
    contracts: Contract[];
    inventory: Item[];
    currency: number;
    admin_note: string;
    life_status: 'Жив' | 'Мёртв';
    status: string;
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

export const AdminAnketaEditor: FC<NavIdProps & { setModal: (modal: ReactNode | null) => void; fetchedUser?: UserInfo }> = ({ id, setModal, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;

  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);


  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        const data = await response.json();
        // Преобразование для обратной совместимости, если appearance - строка
        if (typeof data.appearance === 'string' || !data.appearance) {
          data.appearance = { text: data.appearance || '', images: [] };
        } else if (data.appearance && typeof data.appearance.text === 'string' && data.appearance.text.startsWith('{')) {
          // Если text содержит JSON, парсим его
          try {
            const parsedAppearance = JSON.parse(data.appearance.text);
            data.appearance = parsedAppearance;
          } catch (e) {
            // Если не удалось распарсить, оставляем как есть
          }
        }
        if (!data.character_images) {
          data.character_images = [];
        }
        if (data.contracts) {
            data.contracts.forEach((c: Contract) => {
                if (!c.creature_images) c.creature_images = [];
            });
        }
        if (data.inventory) {
            data.inventory.forEach((i: Item) => {
                if (!i.image_url) i.image_url = [];
                if (!i.sinki_type) i.sinki_type = undefined;
                if (!i.rank) i.rank = undefined;
            });
        }
        setCharacter(data);
      } catch (error) {
        console.error('Failed to fetch character:', error);
      } finally {
        setLoading(false);
      }
    };

    if (characterId) {
      fetchCharacter();
    }
  }, [characterId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (character) {
        const nameParts = name.split('.');
        if (nameParts.length > 1 && nameParts[0] === 'appearance') {
            setCharacter({
                ...character,
                appearance: {
                    ...character.appearance,
                    [nameParts[1]]: value
                }
            });
        } else {
            let processedValue: string | number = value;
            if (name === 'age' || name === 'currency') {
                processedValue = parseInt(value, 10) || 0;
            }
            setCharacter({ ...character, [name]: processedValue });
        }
    }
  };

  const handleAttributeChange = (name: string, value: string) => {
    if (!character) return;
    const newAttributes = { ...character.attributes };
    if (value === 'none') {
      delete newAttributes[name];
    } else {
      newAttributes[name] = value;
    }
    setCharacter(prev => prev ? ({
      ...prev,
      attributes: newAttributes
    }) : null);
  };

  const handleArchetypeChange = (archetype: string, isSelected: boolean) => {
    if (!character) return;
    setCharacter(prev => prev ? ({
      ...prev,
      archetypes: isSelected
        ? [...prev.archetypes, archetype]
        : prev.archetypes.filter(a => a !== archetype)
    }) : null);
  };

  const handleContractChange = (index: number, fieldOrObject: string | Partial<Contract>, value?: any) => {
    if (!character) return;

    const newContracts = [...character.contracts];
    let updatedContract = { ...newContracts[index] };

    if (typeof fieldOrObject === 'string') {
      // Обновление одного поля
      updatedContract = { ...updatedContract, [fieldOrObject]: value };
      if (fieldOrObject === 'sync_level') {
        updatedContract.unity_stage = getUnityStage(Number(value));
      }
    } else {
      // Обновление нескольких полей из объекта
      updatedContract = { ...updatedContract, ...fieldOrObject };
      if (fieldOrObject.sync_level !== undefined) {
        updatedContract.unity_stage = getUnityStage(fieldOrObject.sync_level);
      }
    }

    newContracts[index] = updatedContract;
    setCharacter(prev => prev ? { ...prev, contracts: newContracts } : null);
  };

  const addContract = () => {
    if (!character) return;
    setCharacter(prev => prev ? ({ ...prev, contracts: [...prev.contracts, { ...emptyContract }] }) : null);
  };

  const removeContract = (index: number) => {
    if (!character || character.contracts.length <= 1) return;
    const newContracts = character.contracts.filter((_, i) => i !== index);
    setCharacter(prev => prev ? ({ ...prev, contracts: newContracts }) : null);
  };

  const handleInventoryChange = (newInventory: Item[]) => {
      if (!character) return;
      setCharacter(prev => prev ? ({ ...prev, inventory: newInventory }) : null);
  }

  const handleCharacterImageChange = (index: number, value: string) => {
    if (!character) return;
    const newImages = [...character.character_images];
    newImages[index] = value;
    setCharacter(prev => prev ? ({ ...prev, character_images: newImages }) : null);
  };

  const addCharacterImage = () => {
    if (!character) return;
    setCharacter(prev => prev ? ({ ...prev, character_images: [...prev.character_images, ''] }) : null);
  };

  const removeCharacterImage = (index: number) => {
    if (!character) return;
    const newImages = character.character_images.filter((_, i) => i !== index);
    setCharacter(prev => prev ? ({ ...prev, character_images: newImages }) : null);
  };

  const pollTaskResult = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${AI_API_URL}/tasks/${taskId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          setModal(
            <ModalRoot activeModal="ai-result">
              <ModalPage
                id="ai-result"
                onClose={() => setModal(null)}
                header={<ModalPageHeader>Результат проверки ИИ</ModalPageHeader>}
              >
                <Div>
                  <ReactMarkdown>{data.result}</ReactMarkdown>
                </Div>
              </ModalPage>
            </ModalRoot>
          );
        } else if (data.status === 'error') {
          clearInterval(interval);
          setLoading(false);
          throw new Error(data.detail || 'AI check failed');
        }
      } catch (error) {
        clearInterval(interval);
        setLoading(false);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >{`Ошибка проверки ИИ: ${message}`}</Snackbar>);
      }
    }, 8000);

    setTimeout(() => {
      clearInterval(interval);
      if (loading) {
        setLoading(false);
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >Проверка ИИ заняла слишком много времени.</Snackbar>);
      }
    }, 120000); // 2 minutes timeout
  };

  const handleAICheck = async () => {
    if (!character) return;
    setLoading(true);
    setSnackbar(<Snackbar
      onClose={() => setSnackbar(null)}
    >Проверка ИИ запущена...</Snackbar>);

    try {
      const response = await fetch(`${AI_API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_data: character,
          vk_id: fetchedUser?.id || 0,
          admin_id: localStorage.getItem('adminId'),
          character_id: characterId,
        }),
      });

      if (response.status !== 200) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.detail || 'Failed to start AI check');
        } catch (e) {
            throw new Error(errorText || 'Failed to start AI check');
        }
      }

      const data = await response.json();
      pollTaskResult(data.task_id);

    } catch (error) {
      setLoading(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка запуска проверки ИИ: ${message}`}</Snackbar>);
    }
  };

  const handleShowHistory = async () => {
    if (!characterId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/ai-analysis`);
      const data = await response.json();
      setModal(
        <ModalRoot activeModal="ai-history">
          <ModalPage
            id="ai-history"
            onClose={() => setModal(null)}
            header={<ModalPageHeader>История проверок ИИ</ModalPageHeader>}
          >
            <Div>
              {data.length > 0 ? (
                data.map((item: any) => (
                  <div key={item.id}>
                    <p><strong>{new Date(item.timestamp).toLocaleString()}</strong></p>
                    <ReactMarkdown>{item.result}</ReactMarkdown>
                    <Separator />
                  </div>
                ))
              ) : (
                <p>История проверок пуста.</p>
              )}
            </Div>
          </ModalPage>
        </ModalRoot>
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка загрузки истории: ${message}`}</Snackbar>);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const adminId = localStorage.getItem('adminId');
    if (!character || !adminId) return;

    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId,
        },
        body: JSON.stringify(character),
      });

      if (response.ok) {
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >Анкета успешно обновлена!</Snackbar>);
        routeNavigator.push('/admin_panel');
      } else {
        const errorData = await response.text();
        console.error("Server response:", errorData);
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
        console.error("Save error:", error);
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >{`Ошибка сохранения: ${message}`}</Snackbar>);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>
        Редактировать анкету (Админ)
      </PanelHeader>
      {loading ? (
        <ScreenSpinner />
      ) : character ? (
        <AnketaEditor
          id={id}
          setModal={setModal}
          fetchedUser={fetchedUser}
          isAdminEditor={true}
          character={character}
          onCharacterChange={setCharacter}
          onSave={handleSave}
          onAICheck={handleAICheck}
          onShowHistory={handleShowHistory}
          snackbar={snackbar}
          isNewCharacter={false}
        />
      ) : (
        <Div>Не удалось загрузить данные анкеты.</Div>
      )}
    </Panel>
  );
};