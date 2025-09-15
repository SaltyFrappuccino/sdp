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
  strength: number;
  agility: number;
  intellect: number;
  endurance: number;
  luck: number;
  first_name?: string;
  last_name?: string;
}

type ModalType = 'attributes' | 'currency' | 'inventory' | null;

export const BulkCharacterManagement: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Состояние для модальных окон
  const [attributeChanges, setAttributeChanges] = useState({
    strength: 0,
    agility: 0,
    intellect: 0,
    endurance: 0,
    luck: 0
  });
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

  const handleCharacterSelect = (characterId: number) => {
    const newSelected = new Set(selectedCharacters);
    if (newSelected.has(characterId)) {
      newSelected.delete(characterId);
    } else {
      newSelected.add(characterId);
    }
    setSelectedCharacters(newSelected);
  };

  const selectAllVisible = () => {
    const allVisibleIds = new Set(characters.map(c => c.id));
    setSelectedCharacters(allVisibleIds);
  };

  const clearSelection = () => {
    setSelectedCharacters(new Set());
  };

  const bulkUpdateAttributes = async () => {
    if (selectedCharacters.size === 0) {
      showSnackbar('Выберите персонажей', false);
      return;
    }

    // Проверяем что есть изменения
    const hasChanges = Object.values(attributeChanges).some(value => value !== 0);
    if (!hasChanges) {
      showSnackbar('Укажите изменения атрибутов', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/characters/bulk-update-attributes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({
          character_ids: Array.from(selectedCharacters),
          attribute_changes: attributeChanges
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(`Обновлено ${result.updated_count} персонажей`, true);
        setActiveModal(null);
        resetForms();
        fetchCharacters();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка обновления', false);
      }
    } catch (error) {
      console.error('Failed to update attributes:', error);
      showSnackbar('Ошибка соединения', false);
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

      if (response.ok) {
        const result = await response.json();
        showSnackbar(`Обновлено ${result.updated_count} персонажей`, true);
        setActiveModal(null);
        resetForms();
        fetchCharacters();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка обновления', false);
      }
    } catch (error) {
      console.error('Failed to update currency:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const bulkAddInventory = async () => {
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
          item_name: inventoryItem.name.trim(),
          item_description: inventoryItem.description.trim(),
          quantity: inventoryItem.quantity
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(`Обновлено ${result.updated_count} персонажей`, true);
        setActiveModal(null);
        resetForms();
        fetchCharacters();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка добавления', false);
      }
    } catch (error) {
      console.error('Failed to add inventory:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setAttributeChanges({
      strength: 0,
      agility: 0,
      intellect: 0,
      endurance: 0,
      luck: 0
    });
    setCurrencyChange(0);
    setInventoryItem({
      name: '',
      description: '',
      quantity: 1
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0);
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
            <Text weight="2" style={{ fontSize: 18, marginBottom: 12 }}>
              Поиск персонажей
            </Text>
            
            <Search
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Поиск по имени, рангу, фракции..."
              before={<Icon28SearchOutline />}
            />
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: 12,
              fontSize: 14,
              color: '#666'
            }}>
              <Text>
                Найдено: {totalCharacters} | Выбрано: {selectedCharacters.size}
              </Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="s" mode="secondary" onClick={selectAllVisible}>
                  Выбрать все на странице
                </Button>
                <Button size="s" mode="secondary" onClick={clearSelection}>
                  Очистить выбор
                </Button>
              </div>
            </div>
          </Div>
        </Card>

        {/* Действия */}
        <Card style={{ marginBottom: 16 }}>
          <Div>
            <Text weight="2" style={{ fontSize: 18, marginBottom: 12 }}>
              Массовые операции
            </Text>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Button
                onClick={() => setActiveModal('attributes')}
                disabled={selectedCharacters.size === 0}
                before={<Icon28UsersOutline />}
                style={{ backgroundColor: '#2196F3', color: 'white' }}
              >
                Изменить атрибуты ({selectedCharacters.size})
              </Button>
              
              <Button
                onClick={() => setActiveModal('currency')}
                disabled={selectedCharacters.size === 0}
                before={<Icon28MoneyCircleOutline />}
                style={{ backgroundColor: '#4CAF50', color: 'white' }}
              >
                Изменить валюту ({selectedCharacters.size})
              </Button>
              
              <Button
                onClick={() => setActiveModal('inventory')}
                disabled={selectedCharacters.size === 0}
                before={<Icon28GiftOutline />}
                style={{ backgroundColor: '#FF9800', color: 'white' }}
              >
                Добавить предмет ({selectedCharacters.size})
              </Button>
            </div>
          </Div>
        </Card>

        {/* Список персонажей */}
        {loading && characters.length === 0 ? (
          <Placeholder>
            <Spinner size="l" />
          </Placeholder>
        ) : characters.length === 0 ? (
          <Placeholder
            icon={<Icon28SearchOutline />}
          >
            <Text weight="2" style={{ fontSize: 18, marginBottom: 8 }}>
              Персонажи не найдены
            </Text>
            <Text style={{ color: '#666' }}>
              {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Нет персонажей в системе'}
            </Text>
          </Placeholder>
        ) : (
          <>
            {characters.map(character => (
              <Card key={character.id} style={{ marginBottom: 8 }}>
                <Div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Checkbox
                      checked={selectedCharacters.has(character.id)}
                      onChange={() => handleCharacterSelect(character.id)}
                    />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text weight="2" style={{ fontSize: 16 }}>
                          {character.character_name}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                          ID: {character.id}
                        </Text>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, fontSize: 14 }}>
                        <Text>Ранг: {character.rank}</Text>
                        <Text>Фракция: {character.faction}</Text>
                        <Text>💰 {character.currency}</Text>
                        {character.first_name && (
                          <Text>Игрок: {character.first_name} {character.last_name}</Text>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#666' }}>
                        <span>💪 {character.strength}</span>
                        <span>⚡ {character.agility}</span>
                        <span>🧠 {character.intellect}</span>
                        <span>🛡️ {character.endurance}</span>
                        <span>🍀 {character.luck}</span>
                      </div>
                    </div>
                  </div>
                </Div>
              </Card>
            ))}

            {/* Пагинация */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: 16
            }}>
              <Button 
                size="s" 
                mode="secondary" 
                onClick={prevPage}
                disabled={currentPage === 0}
              >
                ← Назад
              </Button>
              
              <Text style={{ fontSize: 14, color: '#666' }}>
                Страница {currentPage + 1} из {Math.ceil(totalCharacters / limit)}
              </Text>
              
              <Button 
                size="s" 
                mode="secondary" 
                onClick={nextPage}
                disabled={(currentPage + 1) * limit >= totalCharacters}
              >
                Вперед →
              </Button>
            </div>
          </>
        )}
      </Div>

      {/* Модальные окна */}
      <ModalRoot activeModal={activeModal}>
        {/* Модальное окно изменения атрибутов */}
        <ModalPage
          id="attributes"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Изменить атрибуты</ModalPageHeader>}
        >
          <Div>
            <Text style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              Выбрано персонажей: {selectedCharacters.size}
            </Text>

            <div style={{ display: 'grid', gap: 12 }}>
              <FormItem top="💪 Сила">
                <Input
                  type="number"
                  value={attributeChanges.strength.toString()}
                  onChange={(e) => setAttributeChanges(prev => ({
                    ...prev,
                    strength: parseInt(e.target.value) || 0
                  }))}
                  placeholder="0 (без изменений)"
                />
              </FormItem>

              <FormItem top="⚡ Ловкость">
                <Input
                  type="number"
                  value={attributeChanges.agility.toString()}
                  onChange={(e) => setAttributeChanges(prev => ({
                    ...prev,
                    agility: parseInt(e.target.value) || 0
                  }))}
                  placeholder="0 (без изменений)"
                />
              </FormItem>

              <FormItem top="🧠 Интеллект">
                <Input
                  type="number"
                  value={attributeChanges.intellect.toString()}
                  onChange={(e) => setAttributeChanges(prev => ({
                    ...prev,
                    intellect: parseInt(e.target.value) || 0
                  }))}
                  placeholder="0 (без изменений)"
                />
              </FormItem>

              <FormItem top="🛡️ Выносливость">
                <Input
                  type="number"
                  value={attributeChanges.endurance.toString()}
                  onChange={(e) => setAttributeChanges(prev => ({
                    ...prev,
                    endurance: parseInt(e.target.value) || 0
                  }))}
                  placeholder="0 (без изменений)"
                />
              </FormItem>

              <FormItem top="🍀 Удача">
                <Input
                  type="number"
                  value={attributeChanges.luck.toString()}
                  onChange={(e) => setAttributeChanges(prev => ({
                    ...prev,
                    luck: parseInt(e.target.value) || 0
                  }))}
                  placeholder="0 (без изменений)"
                />
              </FormItem>
            </div>

            <Text style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 16 }}>
              Используйте отрицательные числа для уменьшения атрибутов
            </Text>

            <Button
              size="l"
              onClick={bulkUpdateAttributes}
              disabled={loading}
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
                value={currencyChange.toString()}
                onChange={(e) => setCurrencyChange(parseInt(e.target.value) || 0)}
                placeholder="Введите изменение (положительное или отрицательное)"
              />
            </FormItem>

            <Text style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
              Положительное число для добавления, отрицательное для вычитания валюты
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
                onChange={(e) => setInventoryItem(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Например: Меч дракона"
              />
            </FormItem>

            <FormItem top="📝 Описание предмета">
              <Textarea
                value={inventoryItem.description}
                onChange={(e) => setInventoryItem(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Описание предмета (необязательно)"
                rows={3}
              />
            </FormItem>

            <FormItem top="🔢 Количество">
              <Input
                type="number"
                value={inventoryItem.quantity.toString()}
                onChange={(e) => setInventoryItem(prev => ({
                  ...prev,
                  quantity: Math.max(1, parseInt(e.target.value) || 1)
                }))}
                min="1"
              />
            </FormItem>

            <Button
              size="l"
              onClick={bulkAddInventory}
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
