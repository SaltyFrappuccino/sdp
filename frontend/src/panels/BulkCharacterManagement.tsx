import React, { FC, useState, useEffect } from 'react';
import {
  Panel, PanelHeader, Div, Card, Text, Button, Input, Snackbar,
  ModalRoot, ModalPage, ModalPageHeader, FormItem, Checkbox, Search, 
  Textarea, Placeholder, Spinner, PanelHeaderBack
} from '@vkontakte/vkui';
import { Icon28SearchOutline, Icon28UsersOutline, Icon28MoneyCircleOutline, Icon28GiftOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface Character {
  id: number;
  character_name: string;
  rank: string;
  faction: string;
  currency: number;
  attribute_points_total: number;
  vk_id: number;
  first_name?: string;
  last_name?: string;
}

type ModalType = 'attribute_points' | 'currency' | 'inventory' | null;

export const BulkCharacterManagement: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Состояние для модальных окон
  const [attributePointsChange, setAttributePointsChange] = useState(0);
  const [currencyChange, setCurrencyChange] = useState(0);
  const [inventoryItem, setInventoryItem] = useState({
    name: '',
    description: '',
    quantity: 1
  });

  // Пагинация
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchCharacters();
  }, [searchQuery, currentPage]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/admin/characters?search=${encodeURIComponent(searchQuery)}&limit=${limit}&offset=${currentPage * limit}`,
        {
          headers: { 'x-admin-id': '1' }
        }
      );
      const data = await response.json();
      setCharacters(data.characters || []);
      setTotalCharacters(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      showSnackbar('Ошибка загрузки персонажей', false);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, success: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={success ? '✅' : '❌'}
      >
        {message}
      </Snackbar>
    );
  };

  const toggleCharacterSelection = (characterId: number) => {
    const newSelected = new Set(selectedCharacters);
    if (newSelected.has(characterId)) {
      newSelected.delete(characterId);
    } else {
      newSelected.add(characterId);
    }
    setSelectedCharacters(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCharacters.size === characters.length) {
      setSelectedCharacters(new Set());
    } else {
      setSelectedCharacters(new Set(characters.map(c => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedCharacters(new Set());
  };

  const bulkUpdateAttributePoints = async () => {
    if (selectedCharacters.size === 0) {
      showSnackbar('Выберите персонажей', false);
      return;
    }

    if (attributePointsChange === 0) {
      showSnackbar('Укажите изменение очков атрибутов', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/characters/bulk-update-attribute-points`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({
          character_ids: Array.from(selectedCharacters),
          attribute_points_change: attributePointsChange
        })
      });

      const data = await response.json();
      if (response.ok) {
        showSnackbar(`Очки атрибутов обновлены для ${selectedCharacters.size} персонажей`, true);
        fetchCharacters();
        setActiveModal(null);
        setAttributePointsChange(0);
      } else {
        showSnackbar(data.error || 'Ошибка обновления очков атрибутов', false);
      }
    } catch (error) {
      console.error('Error updating attribute points:', error);
      showSnackbar('Ошибка сети при обновлении очков атрибутов', false);
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateCurrency = async () => {
    if (selectedCharacters.size === 0) {
      showSnackbar('Выберите персонажей', false);
      return;
    }

    if (currencyChange === 0) {
      showSnackbar('Укажите изменение валюты', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/characters/bulk-update-currency`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({
          character_ids: Array.from(selectedCharacters),
          currency_change: currencyChange
        })
      });

      const data = await response.json();
      if (response.ok) {
        showSnackbar(`Валюта обновлена для ${selectedCharacters.size} персонажей`, true);
        fetchCharacters();
        setActiveModal(null);
        setCurrencyChange(0);
      } else {
        showSnackbar(data.error || 'Ошибка обновления валюты', false);
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      showSnackbar('Ошибка сети при обновлении валюты', false);
    } finally {
      setLoading(false);
    }
  };

  const bulkAddInventoryItem = async () => {
    if (selectedCharacters.size === 0) {
      showSnackbar('Выберите персонажей', false);
      return;
    }

    if (!inventoryItem.name.trim()) {
      showSnackbar('Укажите название предмета', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/characters/bulk-add-inventory`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({
          character_ids: Array.from(selectedCharacters),
          item: {
            name: inventoryItem.name.trim(),
            description: inventoryItem.description.trim() || '',
            type: 'Обычный',
            quantity: inventoryItem.quantity
          }
        })
      });

      const data = await response.json();
      if (response.ok) {
        showSnackbar(`Предмет добавлен ${selectedCharacters.size} персонажам`, true);
        setActiveModal(null);
        setInventoryItem({ name: '', description: '', quantity: 1 });
        // Не обновляем список персонажей, так как инвентарь не отображается в списке
      } else {
        showSnackbar(data.error || 'Ошибка добавления предмета', false);
      }
    } catch (error) {
      console.error('Error adding inventory item:', error);
      showSnackbar('Ошибка сети при добавлении предмета', false);
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if ((currentPage + 1) * limit < totalCharacters) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>
        👑 Управление Персонажами
      </PanelHeader>

      <Div>
        {/* Поиск */}
        <Card style={{ marginBottom: 16 }}>
          <Div>
            <Search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, рангу, фракции..."
              icon={<Icon28SearchOutline />}
            />
          </Div>
        </Card>

        {/* Массовые операции */}
        <Card style={{ marginBottom: 16 }}>
          <Div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text weight="2">
                <Icon28UsersOutline style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Массовые операции
              </Text>
              <Text style={{ color: '#666', fontSize: 14 }}>
                Выбрано: {selectedCharacters.size}
              </Text>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <Button 
                size="s" 
                mode="outline" 
                onClick={toggleSelectAll}
              >
                {selectedCharacters.size === characters.length ? 'Снять выбор' : 'Выбрать все'}
              </Button>
              <Button 
                size="s" 
                mode="outline" 
                onClick={clearSelection}
                disabled={selectedCharacters.size === 0}
              >
                Очистить выбор
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              <Button 
                mode="secondary" 
                size="m"
                onClick={() => setActiveModal('attribute_points')}
                disabled={selectedCharacters.size === 0}
                before={<Icon28UsersOutline />}
              >
                Очки атрибутов
              </Button>
              <Button 
                mode="secondary" 
                size="m"
                onClick={() => setActiveModal('currency')}
                disabled={selectedCharacters.size === 0}
                before={<Icon28MoneyCircleOutline />}
              >
                Изменить валюту
              </Button>
              <Button 
                mode="secondary" 
                size="m"
                onClick={() => setActiveModal('inventory')}
                disabled={selectedCharacters.size === 0}
                before={<Icon28GiftOutline />}
              >
                Добавить предмет
              </Button>
            </div>
          </Div>
        </Card>

        {/* Список персонажей */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size="l" />
          </div>
        ) : characters.length > 0 ? (
          <>
            {characters.map(character => (
              <Card key={character.id} style={{ marginBottom: 12 }}>
                <Div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Checkbox
                      checked={selectedCharacters.has(character.id)}
                      onChange={() => toggleCharacterSelection(character.id)}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <Text weight="2" style={{ marginBottom: 4 }}>
                        {character.character_name}
                      </Text>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, fontSize: 14 }}>
                        <Text>Ранг: {character.rank}</Text>
                        <Text>Фракция: {character.faction}</Text>
                        <Text>💰 {character.currency}</Text>
                        <Text>⚡ Очки атрибутов: {character.attribute_points_total}</Text>
                        {character.first_name && (
                          <Text>Игрок: {character.first_name && character.last_name ? `${character.first_name} ${character.last_name}` : `VK ID: ${character.vk_id}`}</Text>
                        )}
                      </div>
                    </div>
                  </div>
                </Div>
              </Card>
            ))}

            {/* Пагинация */}
            <Card>
              <Div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    size="m"
                    mode="secondary"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                  >
                    Предыдущая
                  </Button>

                  <Text style={{ fontSize: 14, color: '#666' }}>
                    Страница {currentPage + 1}, показано {characters.length} из {totalCharacters}
                  </Text>

                  <Button
                    size="m"
                    mode="secondary"
                    onClick={nextPage}
                    disabled={(currentPage + 1) * limit >= totalCharacters}
                  >
                    Следующая
                  </Button>
                </div>
              </Div>
            </Card>
          </>
        ) : (
          <Placeholder
            icon={<Icon28UsersOutline />}
          >
            <Text>Персонажи не найдены</Text>
          </Placeholder>
        )}
      </Div>

      {/* Модальные окна */}
      <ModalRoot activeModal={activeModal}>
        {/* Модальное окно изменения очков атрибутов */}
        <ModalPage
          id="attribute_points"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Изменить очки атрибутов</ModalPageHeader>}
        >
          <Div>
            <Text style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              Выбрано персонажей: {selectedCharacters.size}
            </Text>
            
            <Text style={{ marginBottom: 16, fontSize: 14 }}>
              Очки атрибутов используются игроками для распределения по навыкам (Сила, Ловкость, Выносливость и т.д.). 
              Указывайте изменение количества доступных очков.
            </Text>

            <FormItem top="⚡ Изменение очков атрибутов">
              <Input
                type="number"
                value={attributePointsChange}
                onChange={(e) => setAttributePointsChange(Number(e.target.value))}
                placeholder="Например: +5 или -3"
              />
            </FormItem>
            
            <Text style={{ marginBottom: 16, fontSize: 12, color: '#666' }}>
              Используйте отрицательные числа для уменьшения очков атрибутов
            </Text>

            <Button
              size="l"
              onClick={bulkUpdateAttributePoints}
              disabled={loading || attributePointsChange === 0}
              style={{ width: '100%' }}
            >
              {loading ? 'Обновление...' : 'Применить изменения'}
            </Button>
          </Div>
        </ModalPage>

        {/* Модальное окно изменения валюты */}
        <ModalPage
          id="currency"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Изменить валюту</ModalPageHeader>}
        >
          <Div>
            <Text style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              Выбрано персонажей: {selectedCharacters.size}
            </Text>

            <FormItem top="💰 Изменение валюты">
              <Input
                type="number"
                value={currencyChange}
                onChange={(e) => setCurrencyChange(Number(e.target.value))}
                placeholder="Например: +1000 или -500"
              />
            </FormItem>
            
            <Text style={{ marginBottom: 16, fontSize: 12, color: '#666' }}>
              Используйте отрицательные числа для списания валюты
            </Text>

            <Button
              size="l"
              onClick={bulkUpdateCurrency}
              disabled={loading || currencyChange === 0}
              style={{ width: '100%' }}
            >
              {loading ? 'Обновление...' : 'Применить изменения'}
            </Button>
          </Div>
        </ModalPage>

        {/* Модальное окно добавления предмета */}
        <ModalPage
          id="inventory"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Добавить предмет</ModalPageHeader>}
        >
          <Div>
            <Text style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              Выбрано персонажей: {selectedCharacters.size}
            </Text>

            <FormItem top="🎁 Название предмета *">
              <Input
                value={inventoryItem.name}
                onChange={(e) => setInventoryItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Исцеляющий эликсир"
              />
            </FormItem>

            <FormItem top="📝 Описание предмета">
              <Textarea
                value={inventoryItem.description}
                onChange={(e) => setInventoryItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание предмета..."
                rows={3}
              />
            </FormItem>

            <FormItem top="🔢 Количество">
              <Input
                type="number"
                min="1"
                value={inventoryItem.quantity}
                onChange={(e) => setInventoryItem(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
              />
            </FormItem>

            <Button
              size="l"
              onClick={bulkAddInventoryItem}
              disabled={loading || !inventoryItem.name.trim()}
              style={{ width: '100%' }}
            >
              {loading ? 'Добавление...' : 'Добавить предмет'}
            </Button>
          </Div>
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};