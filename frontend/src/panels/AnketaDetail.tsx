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
  ModalPageHeader
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect } from 'react';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { UserInfo } from '@vkontakte/vk-bridge';
import { API_URL } from '../api';
import { getVersionDiff } from '../utils/diff';

interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: string;
}

interface Ability {
    name: string;
    description: string;
    cell_type: 'Нулевая' | 'Малая (I)' | 'Значительная (II)' | 'Предельная (III)';
    cell_cost: number;
    tags: Record<string, string>;
}

interface Contract {
    contract_name: string;
    creature_name: string;
    creature_rank: string;
    creature_description: string;
    sync_level: number;
    unity_stage: string;
    abilities: Ability[];
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
    appearance: string;
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    inventory: Item[];
    currency: number;
    contracts: Contract[];
    admin_note: string;
}

export interface AnketaDetailProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const AnketaDetail: FC<AnketaDetailProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [versions, setVersions] = useState<any[]>([]);
  const [activeModal, setActiveModal] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        const data = await response.json();
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
                            const currentVersionData = version.data ? JSON.parse(version.data) : {};
                            const previousVersionData = versions[versions.indexOf(version) + 1]
                              ? JSON.parse((versions[versions.indexOf(version) + 1] as any).data)
                              : null;
                            const diff = getVersionDiff(currentVersionData, previousVersionData);

                            return (
                              <>
                                {Object.keys(diff.changed).length > 0 && (
                                  <Group header={<Header subtitle="Изменено" />}>
                                    {Object.entries(diff.changed).map(([key, { from, to }]) => (
                                      <SimpleCell key={key} multiline>
                                        <Text><b>{key}:</b></Text>
                                        <Text>Было: {JSON.stringify(from)}</Text>
                                        <Text>Стало: {JSON.stringify(to)}</Text>
                                      </SimpleCell>
                                    ))}
                                  </Group>
                                )}
                                {Object.keys(diff.added).length > 0 && (
                                  <Group header={<Header subtitle="Добавлено" />}>
                                    {Object.entries(diff.added).map(([key, value]) => (
                                      <SimpleCell key={key} multiline>
                                        <b>{key}:</b> {JSON.stringify(value)}
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
              </Group>
              <Group>
                <Header>II. ЛИЧНОСТЬ И ВНЕШНОСТЬ</Header>
                <Div>{character.appearance}</Div>
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
                        <Div>
                          <Title level="3" style={{ marginBottom: 8 }}>{contract.creature_name} ({contract.creature_rank})</Title>
                          <Text style={{ marginBottom: 16 }}>{contract.creature_description}</Text>
                          
                          <Subhead weight="1">Синхронизация: {contract.sync_level}%</Subhead>
                          <Progress value={contract.sync_level} style={{ marginBottom: 8 }} />

                          <Subhead weight="1">Ступень Единства: {contract.unity_stage}</Subhead>
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
                                            <Title level="3">{ability.name}</Title>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {character.inventory.map((item, index) => (
                            <Card key={index} mode="shadow">
                                <RichCell
                                    after={item.type === 'Синки' ? `Синки: ${item.sinki_type}` : 'Обычный предмет'}
                                    multiline
                                    subtitle={item.rank ? `Ранг: ${item.rank}` : ''}
                                >
                                    <Title level="3">{item.name}</Title>
                                </RichCell>
                                <Div>
                                    <Text>{item.description}</Text>
                                </Div>
                            </Card>
                        ))}
                    </div>
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
          </Div>
        </>
      ) : (
        <Div>Не удалось загрузить данные персонажа.</Div>
      )}
    </Panel>
  );
};