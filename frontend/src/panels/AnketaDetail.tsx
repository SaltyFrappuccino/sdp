import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  Header,
  Spinner,
  Div,
  PanelHeaderBack,
  SimpleCell,
  Separator,
  Tabs,
  TabsItem,
  View,
  Card,
  RichCell,
  Subhead,
  Text,
  Title,
  Accordion,
  Progress,
  Button,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  CardGrid,
  Image,
  Snackbar
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { UserInfo } from '@vkontakte/vk-bridge';
import { API_URL } from '../api';
import { getVersionDiff } from '../utils/diff';
import { exportAnketaToJson, downloadJsonFile } from '../utils/anketaExport';

const formatValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '(пусто)';
  }
  if (typeof value === 'string' && value.trim() === '') {
    return '(пустая строка)';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
};

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
    abilities?: Ability[];
}

interface Ability {
    name: string;
    description: string;
    cell_type: 'Нулевая' | 'Малая (I)' | 'Значительная (II)' | 'Предельная (III)';
    cell_cost: number;
    tags: Record<string, string>;
    is_summon?: boolean;
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
    abilities: Ability[];
    creature_images?: string[];
    manifestation?: {
        modus?: 'Аватар' | 'Проекция' | 'Вооружение' | 'Слияние';
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
}

interface Character {
    id: number;
    vk_id: number;
    status: string;
    character_name: string;
    nickname: string;
    age: number;
    rank: string;
    faction: string;
    faction_position: string;
    home_island: string;
    appearance: string | { text: string; images?: string[] };
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    inventory: Item[];
    currency: number;
    contracts: Contract[];
    admin_note: string;
    character_images?: string[];
    life_status: 'Жив' | 'Мёртв';
}

export interface AnketaDetailProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const AnketaDetail: FC<AnketaDetailProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const handleExportAnketa = () => {
    if (!character) return;
    
    try {
      const jsonString = exportAnketaToJson(character, fetchedUser);
      const filename = `anketa_${character.character_name}_${new Date().toISOString().split('T')[0]}.json`;
      downloadJsonFile(jsonString, filename);
      
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Анкета успешно экспортирована!
        </Snackbar>
      );
    } catch (error) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при экспорте анкеты
        </Snackbar>
      );
    }
  };
  const [activeTab, setActiveTab] = useState('general');
  const [versions, setVersions] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/versions`);
      const data = await response.json();
      setVersions(data);
      setActiveModal('history');
    } catch (error) {
      console.error('Failed to fetch character versions:', error);
    }
  };

  const openImageModal = (img: string) => {
    setSelectedImage(img);
    setActiveModal('image');
  };

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        const data = await response.json();
        // Преобразование для обратной совместимости, если appearance - строка
        if (typeof data.appearance === 'string') {
          data.appearance = { text: data.appearance, images: [] };
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


  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Просмотр анкеты
      </PanelHeader>
      {loading ? (
        <Spinner size="l" style={{ margin: '20px 0' }} />
      ) : character ? (
        <>
          <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
            <ModalPage
              id="history"
              onClose={() => setActiveModal(null)}
              header={<ModalPageHeader>История изменений</ModalPageHeader>}
            >
              <Div>
                {versions.length > 0 ? (
                  versions.map((version: any) => (
                    <Accordion key={version.version_id}>
                      <Accordion.Summary>
                        Версия {version.version_number} - {new Date(version.created_at).toLocaleString()}
                      </Accordion.Summary>
                      <Accordion.Content>
                        <Div>
                          {(() => {
                            const currentVersionData = version.data ? 
                              (typeof version.data === 'string' ? JSON.parse(version.data) : version.data) : {};
                            const previousVersionData = versions[versions.indexOf(version) + 1]
                              ? (() => {
                                  const prevData = (versions[versions.indexOf(version) + 1] as any).data;
                                  return prevData ? (typeof prevData === 'string' ? JSON.parse(prevData) : prevData) : null;
                                })()
                              : null;
                            const diff = getVersionDiff(currentVersionData, previousVersionData);

                            return (
                              <>
                                {Object.keys(diff.changed).length > 0 && (
                                  <Group header={<Header subtitle="Изменено" />}>
                                    {Object.entries(diff.changed).map(([key, { from, to }]) => (
                                      <SimpleCell key={key} multiline>
                                        <Text><b>{key}:</b></Text>
                                        <Text>Было: {formatValue(from)}</Text>
                                        <Text>Стало: {formatValue(to)}</Text>
                                      </SimpleCell>
                                    ))}
                                  </Group>
                                )}
                                {Object.keys(diff.added).length > 0 && (
                                  <Group header={<Header subtitle="Добавлено" />}>
                                    {Object.entries(diff.added).map(([key, value]) => (
                                      <SimpleCell key={key} multiline>
                                        <b>{key}:</b> {formatValue(value)}
                                      </SimpleCell>
                                    ))}
                                  </Group>
                                )}
                                {Object.keys(diff.removed).length > 0 && (
                                  <Group header={<Header subtitle="Удалено" />}>
                                    {Object.keys(diff.removed).map(key => (
                                      <SimpleCell key={key}>{key}</SimpleCell>
                                    ))}
                                  </Group>
                                )}
                              </>
                            );
                          })()}
                        </Div>
                      </Accordion.Content>
                    </Accordion>
                  ))
                ) : (
                  <p>История изменений пуста.</p>
                )}
              </Div>
            </ModalPage>
            <ModalPage
              id="image"
              onClose={() => setActiveModal(null)}
              header={<ModalPageHeader>Просмотр изображения</ModalPageHeader>}
              settlingHeight={100}
            >
              <Div style={{ textAlign: 'center' }}>
                <img src={selectedImage || ''} style={{ maxWidth: '100%', maxHeight: '80vh' }} alt="Full size" />
              </Div>
            </ModalPage>
          </ModalRoot>

          <Tabs>
            <TabsItem
              id="general"
              selected={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            >
              Основное
            </TabsItem>
            <TabsItem
              id="combat"
              selected={activeTab === 'combat'}
              onClick={() => setActiveTab('combat')}
            >
              Боевые
            </TabsItem>
            <TabsItem
              id="inventory"
              selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
            >
              Инвентарь
            </TabsItem>
          </Tabs>

          <View activePanel={activeTab}>
            <Panel id="general">
              <Group>
                <Header>I. ОБЩАЯ ИНФОРМАЦИЯ</Header>
                <Div><b>Имя и Фамилия:</b> {character.character_name}</Div>
                <Div><b>Прозвище/Позывной:</b> {character.nickname}</Div>
                <Div><b>Возраст:</b> {character.age}</Div>
                <Div><b>Ранг:</b> {character.rank}</Div>
                <Div><b>Фракция:</b> {character.faction}</Div>
                <Div><b>Позиция во фракции:</b> {character.faction_position}</Div>
                <Div><b>Родной остров:</b> {character.home_island}</Div>
                <Div><b>Статус:</b> {character.life_status}</Div>
              </Group>
              <Group>
                <Header>II. ЛИЧНОСТЬ И ВНЕШНОСТЬ</Header>
                {character.character_images && character.character_images.length > 0 && (
                  <CardGrid size="l">
                    {character.character_images.map((img, i) => (
                      <Card key={i} onClick={() => openImageModal(img)}>
                        <Image src={img} size={128} />
                      </Card>
                    ))}
                  </CardGrid>
                )}
                {typeof character.appearance === 'object' && character.appearance.images && character.appearance.images.length > 0 && (
                  <CardGrid size="l">
                    {character.appearance.images.map((img, i) => (
                      <Card key={i} onClick={() => openImageModal(img)}>
                        <Image src={img} size={128} />
                      </Card>
                    ))}
                  </CardGrid>
                )}
                <Div>{typeof character.appearance === 'object' ? character.appearance.text : character.appearance}</Div>
                <Separator />
                <Div>{character.personality}</Div>
                <Separator />
                <Div>{character.biography}</Div>
              </Group>
            </Panel>
            <Panel id="combat">
                <Group>
                    <Header>III. БОЕВЫЕ ХАРАКТЕРИСТИКИ</Header>
                    <Div><b>Архетип(ы):</b> {character.archetypes.join(', ')}</Div>
                    {Object.entries(character.attributes).map(([key, value]) => (
                      <Div key={key}><b>{key}:</b> {value}</Div>
                    ))}
                    <AuraCellsCalculator
                      currentRank={character.rank}
                      contracts={character.contracts}
                    />
                </Group>
                <Group>
                    <Header>IV. КОНТРАКТ(Ы)</Header>
                    {character.contracts.map((contract, index) => (
                      <Card key={index} mode="shadow" style={{ marginBottom: 16 }}>
                        <Header>{contract.contract_name}</Header>
                        {contract.creature_images && contract.creature_images.length > 0 && (
                          <CardGrid size="l">
                            {contract.creature_images.map((img, i) => (
                              <Card key={i} onClick={() => openImageModal(img)}>
                                <Image src={img} size={128} />
                              </Card>
                            ))}
                          </CardGrid>
                        )}
                        <Div>
                          <Title level="3" style={{ marginBottom: 8 }}>{contract.creature_name} ({contract.creature_rank})</Title>
                          <Text style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}><b>Спектр:</b> {contract.creature_spectrum}</Text>
                          <Text style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{contract.creature_description}</Text>
                          
                          <Card mode="outline" style={{ padding: '8px 12px', marginBottom: 16, background: 'var(--vkui--color_background_secondary)' }}>
                            <Subhead weight="1">🎁 Дар</Subhead>
                            <Text style={{ whiteSpace: 'pre-wrap' }}>{contract.gift}</Text>
                          </Card>

                          <Subhead weight="1">Синхронизация: {contract.sync_level}%</Subhead>
                          <Progress value={contract.sync_level} style={{ marginBottom: 8 }} />

                          <Subhead weight="1">Ступень Единства: {contract.unity_stage}</Subhead>

                          {contract.manifestation && (
                            <Card mode="outline" style={{ marginTop: 12, background: 'var(--vkui--color_background_accent_alpha)' }}>
                              <Div style={{ padding: '12px' }}>
                                <Subhead weight="1" style={{ marginBottom: 8 }}>⚡ Манифестация</Subhead>
                                {contract.manifestation.modus && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text weight="1">Модус:</Text>
                                    <Text>{contract.manifestation.modus}</Text>
                                  </div>
                                )}
                                {contract.manifestation.avatar_description && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text weight="1">Описание:</Text>
                                    <Text>{contract.manifestation.avatar_description}</Text>
                                  </div>
                                )}
                                {contract.manifestation.passive_enhancement && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text weight="1">Пассивное Усиление:</Text>
                                    <Text>{contract.manifestation.passive_enhancement}</Text>
                                  </div>
                                )}
                                {contract.manifestation.ultimate_technique && (
                                  <div>
                                    <Text weight="1">Предельная Техника:</Text>
                                    <Text>{contract.manifestation.ultimate_technique}</Text>
                                  </div>
                                )}
                              </Div>
                            </Card>
                          )}
                          {contract.dominion && (
                            <Card mode="outline" style={{ marginTop: 12, background: 'var(--vkui--color_background_accent_alpha)' }}>
                              <Div style={{ padding: '12px' }}>
                                <Subhead weight="1" style={{ marginBottom: 8 }}>🌌 Доминион: {contract.dominion.name}</Subhead>
                                {contract.dominion.environment_description && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text weight="1">Архитектура Подпространства:</Text>
                                    <Text>{contract.dominion.environment_description}</Text>
                                  </div>
                                )}
                                {contract.dominion.law_name && (
                                  <div style={{ marginBottom: 8 }}>
                                    <Text weight="1">Закон: "{contract.dominion.law_name}"</Text>
                                    <Text>{contract.dominion.law_description}</Text>
                                  </div>
                                )}
                                {contract.dominion.tactical_effects && (
                                  <div>
                                    <Text weight="1">Тактические Эффекты:</Text>
                                    <Text>{contract.dominion.tactical_effects}</Text>
                                  </div>
                                )}
                              </Div>
                            </Card>
                          )}
                        </Div>

                        {contract.abilities && contract.abilities.length > 0 && (
                            <Accordion>
                                <Accordion.Summary>Способности</Accordion.Summary>
                                <Accordion.Content>
                                    {contract.abilities.map((ability, i) => (
                                        <RichCell
                                            key={i}
                                            subtitle={ability.description}
                                            multiline
                                            after={
                                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                                                    <Text>Тип: {ability.cell_type}</Text>
                                                    <Text>Цена: {ability.cell_cost}</Text>
                                                </div>
                                            }
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Title level="3">{ability.name}</Title>
                                                {ability.is_summon && <Subhead weight="1" style={{ color: 'var(--vkui--color_text_accent)' }}>(Призыв)</Subhead>}
                                            </div>
                                            {ability.tags && Object.keys(ability.tags).length > 0 && (
                                                <Div>
                                                    <Subhead>Теги:</Subhead>
                                                    {Object.entries(ability.tags).map(([tag, rank]) => (
                                                        <Text key={tag}>{tag}: {rank}</Text>
                                                    ))}
                                                </Div>
                                            )}
                                        </RichCell>
                                    ))}
                                </Accordion.Content>
                            </Accordion>
                        )}
                      </Card>
                    ))}
                </Group>
            </Panel>
            <Panel id="inventory">
                <Group>
                    <Header>V. ИНВЕНТАРЬ И РЕСУРСЫ</Header>
                    <CardGrid size="l">
                        {character.inventory.map((item, index) => (
                            <Card key={index} mode="shadow">
                                <RichCell
                                    after={item.type === 'Синки' ? `Синки: ${item.sinki_type}` : 'Обычный предмет'}
                                    multiline
                                    subtitle={item.rank ? `Ранг: ${item.rank}` : ''}
                                >
                                    <Title level="3" style={{marginBottom: 4}}>{item.name}</Title>
                                    <Text>{item.description}</Text>
                                </RichCell>
                                {item.sinki_type === 'Эхо' && (
                                    <Div>
                                        {item.aura_cells && (
                                            <Div>
                                                <Subhead>Ячейки Ауры:</Subhead>
                                                <Text>Малые (I): {item.aura_cells.small}</Text>
                                                <Text>Значительные (II): {item.aura_cells.significant}</Text>
                                                <Text>Предельные (III): {item.aura_cells.ultimate}</Text>
                                            </Div>
                                        )}
                                        {item.abilities && item.abilities.length > 0 && (
                                            <Accordion>
                                                <Accordion.Summary>Способности</Accordion.Summary>
                                                <Accordion.Content>
                                                    {item.abilities.map((ability, i) => (
                                                        <RichCell
                                                            key={i}
                                                            subtitle={ability.description}
                                                            multiline
                                                            after={
                                                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                                                                    <Text>Тип: {ability.cell_type}</Text>
                                                                    <Text>Цена: {ability.cell_cost}</Text>
                                                                </div>
                                                            }
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Title level="3">{ability.name}</Title>
                                                                {(ability as any).is_summon && <Subhead weight="1" style={{ color: 'var(--vkui--color_text_accent)' }}>(Призыв)</Subhead>}
                                                            </div>
                                                            {ability.tags && Object.keys(ability.tags).length > 0 && (
                                                                <Div>
                                                                    <Subhead>Теги:</Subhead>
                                                                    {Object.entries(ability.tags).map(([tag, rank]) => (
                                                                        <Text key={tag}>{tag}: {rank}</Text>
                                                                    ))}
                                                                </Div>
                                                            )}
                                                        </RichCell>
                                                    ))}
                                                </Accordion.Content>
                                            </Accordion>
                                        )}
                                    </Div>
                                )}
                                {item.image_url && item.image_url.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '0 16px 16px' }}>
                                      {item.image_url.map((img, i) => (
                                          <img key={i} src={img} style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} onClick={() => openImageModal(img)} />
                                      ))}
                                  </div>
                                )}
                          </Card>
                      ))}
                    </CardGrid>
                    <SimpleCell style={{marginTop: 16}}>Валюта: {character.currency} ₭</SimpleCell>
                </Group>
            </Panel>
          </View>
          {character.admin_note && (
            <Group>
                <Header>Примечание для администрации</Header>
                <Div>{character.admin_note}</Div>
            </Group>
          )}
          <Div>
            <Button stretched size="l" mode="secondary" onClick={fetchVersions}>
              История изменений
            </Button>
            <Button stretched size="l" mode="outline" onClick={handleExportAnketa} style={{ marginTop: '8px' }}>
              📄 Экспорт анкеты
            </Button>
          </Div>
        </>
      ) : (
        <Div>Не удалось загрузить данные персонажа.</Div>
      )}
      {snackbar}
    </Panel>
  );
};