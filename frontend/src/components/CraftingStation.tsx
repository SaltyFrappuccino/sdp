import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Div, Button, Spinner, Group, Header, SimpleCell, ModalCard, ModalRoot, Progress, ModalPage, ModalPageHeader } from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { API_URL } from '../api';

interface CraftRecipe {
  id: number;
  sinki_name: string;
  sinki_rank: string;
  sinki_type: string;
  required_materials: any[];
  success_chance_base: number;
  requires_crafter_rank: string;
  sinki_properties: any;
  description: string;
}

interface CraftingStationProps {
  characterId: number;
  characterRank: string;
  onClose?: () => void;
}

const CraftingStation: React.FC<CraftingStationProps> = ({ characterId, characterRank, onClose }) => {
  const [recipes, setRecipes] = useState<CraftRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<CraftRecipe | null>(null);
  const [materialCheck, setMaterialCheck] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [craftResult, setCraftResult] = useState<any>(null);
  const [craftHistory, setCraftHistory] = useState<any[]>([]);
  const [craftStats, setCraftStats] = useState<any>(null);

  useEffect(() => {
    fetchRecipes();
    fetchCraftHistory();
    fetchCraftStats();
  }, [characterId]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/crafting/recipes/${characterId}`);
      const data = await response.json();
      
      // API может возвращать массив напрямую или объект с полем recipes
      setRecipes(Array.isArray(data) ? data : (data.recipes || []));
    } catch (err) {
      setError('Ошибка загрузки рецептов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCraftHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/crafting/history/${characterId}`);
      const data = await response.json();
      
      // API может возвращать массив напрямую или объект с полем history
      setCraftHistory(Array.isArray(data) ? data : (data.history || []));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCraftStats = async () => {
    try {
      const response = await fetch(`${API_URL}/crafting/stats/${characterId}`);
      const data = await response.json();
      
      // API может возвращать объект напрямую или вложенный
      setCraftStats(data.stats || data || null);
    } catch (err) {
      console.error(err);
    }
  };

  const checkMaterials = async (recipeId: number) => {
    try {
      const response = await fetch(`${API_URL}/crafting/check-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, recipe_id: recipeId })
      });
      const data = await response.json();
      setMaterialCheck(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCraft = async () => {
    if (!selectedRecipe) return;

    try {
      setCrafting(true);
      const response = await fetch(`${API_URL}/crafting/craft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, recipe_id: selectedRecipe.id })
      });
      
      const result = await response.json();
      setCraftResult(result);
      
      // Обновляем историю и статистику
      await fetchCraftHistory();
      await fetchCraftStats();
      
      // Показываем результат
      setActiveModal('result');
    } catch (err) {
      setError('Ошибка при крафте');
      console.error(err);
    } finally {
      setCrafting(false);
    }
  };

  const openRecipeModal = async (recipe: CraftRecipe) => {
    setSelectedRecipe(recipe);
    await checkMaterials(recipe.id);
    setActiveModal('recipe');
  };

  const getRankColor = (rank: string) => {
    const colors: any = {
      F: '#9E9E9E',
      E: '#795548',
      D: '#4CAF50',
      C: '#2196F3',
      B: '#9C27B0',
      A: '#FF9800',
      S: '#F44336',
      SS: '#E91E63',
      SSS: '#FFD700'
    };
    return colors[rank] || '#9E9E9E';
  };

  const canCraft = (recipe: CraftRecipe) => {
    const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const characterRankIndex = rankOrder.indexOf(characterRank);
    const requiredRankIndex = rankOrder.indexOf(recipe.requires_crafter_rank);
    return characterRankIndex >= requiredRankIndex;
  };

  if (loading) {
    return (
      <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="l" />
      </Div>
    );
  }

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      {/* Модал рецепта */}
      <ModalCard
        id="recipe"
        onClose={() => setActiveModal(null)}
        actions={[
          <Button
            key="craft"
            size="l"
            mode="primary"
            onClick={handleCraft}
            disabled={crafting || !materialCheck?.hasAll || !canCraft(selectedRecipe!)}
            loading={crafting}
          >
            {crafting ? 'Создание...' : 'Создать'}
          </Button>,
          <Button key="cancel" size="l" mode="secondary" onClick={() => setActiveModal(null)}>
            Отмена
          </Button>
        ]}
      >
        {selectedRecipe && (
          <Div>
            <Title level="2" style={{ marginBottom: 16 }}>{selectedRecipe.sinki_name}</Title>
            <div style={{
              padding: 16,
              background: `linear-gradient(135deg, ${getRankColor(selectedRecipe.sinki_rank)}33, ${getRankColor(selectedRecipe.sinki_rank)}11)`,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 14, marginBottom: 4, color: 'var(--text_secondary)' }}>
                {selectedRecipe.sinki_type} • Ранг {selectedRecipe.sinki_rank}
              </Text>
              <Text style={{ marginBottom: 8 }}>{selectedRecipe.description}</Text>
              
              {selectedRecipe.sinki_properties && (
                <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Свойства:</Text>
                  <Text style={{ fontSize: 12 }}>
                    {selectedRecipe.sinki_properties.element && `Элемент: ${selectedRecipe.sinki_properties.element}`}<br/>
                    {selectedRecipe.sinki_properties.bonus && `Бонус: +${selectedRecipe.sinki_properties.bonus}`}<br/>
                    {selectedRecipe.sinki_properties.ability && `Способность: ${selectedRecipe.sinki_properties.ability}`}
                  </Text>
                </div>
              )}
            </div>

            <Text weight="2" style={{ marginBottom: 8 }}>Требуемые материалы:</Text>
            {selectedRecipe.required_materials.map((mat: any, idx: number) => {
              const hasEnough = materialCheck?.hasAll === undefined ? null : 
                !materialCheck.missing.some((m: any) => 
                  (m.material_id && m.material_id === mat.material_id) || 
                  (m.material_name && m.material_name === mat.material_name)
                );

              return (
                <div key={idx} style={{
                  padding: 8,
                  marginBottom: 4,
                  background: hasEnough === true ? 'rgba(76, 175, 80, 0.1)' : 
                             hasEnough === false ? 'rgba(244, 67, 54, 0.1)' : 'transparent',
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <Text>{mat.material_name || `Материал #${mat.material_id}`}</Text>
                  <Text weight="2">×{mat.quantity}</Text>
                </div>
              );
            })}

            {materialCheck && !materialCheck.hasAll && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'rgba(244, 67, 54, 0.1)',
                borderRadius: 8,
                border: '1px solid rgba(244, 67, 54, 0.3)'
              }}>
                <Text weight="2" style={{ marginBottom: 8, color: '#F44336' }}>Недостающие материалы:</Text>
                {materialCheck.missing.map((mat: any, idx: number) => (
                  <Text key={idx} style={{ fontSize: 14 }}>
                    • {mat.material_name || `Материал #${mat.material_id}`}: ×{mat.quantity}
                  </Text>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Text>Шанс успеха: {Math.round(selectedRecipe.success_chance_base * 100)}%</Text>
              <Progress value={selectedRecipe.success_chance_base * 100} />
            </div>

            {!canCraft(selectedRecipe) && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'rgba(255, 152, 0, 0.1)',
                borderRadius: 8,
                border: '1px solid rgba(255, 152, 0, 0.3)'
              }}>
                <Text weight="2" style={{ color: '#FF9800' }}>
                  ⚠️ Требуется минимум {selectedRecipe.requires_crafter_rank} ранг
                </Text>
              </div>
            )}
          </Div>
        )}
      </ModalCard>

      {/* Модал результата */}
      <ModalCard
        id="result"
        onClose={() => {
          setActiveModal(null);
          setCraftResult(null);
          setSelectedRecipe(null);
        }}
        actions={[
          <Button
            key="close"
            size="l"
            mode="primary"
            onClick={() => {
              setActiveModal(null);
              setCraftResult(null);
              setSelectedRecipe(null);
            }}
          >
            Закрыть
          </Button>
        ]}
      >
        {craftResult && (
          <Div>
            <Title level="2" style={{ marginBottom: 16 }}>{craftResult.success ? '✓ Успех!' : '✗ Неудача'}</Title>
            {craftResult.success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  {craftResult.sinki.name}
                </Text>
                <Text style={{ marginBottom: 16 }}>
                  Ранг {craftResult.sinki.rank} • {craftResult.sinki.type}
                </Text>
                {craftResult.sinki.properties && (
                  <div style={{
                    padding: 12,
                    background: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 8,
                    marginBottom: 16
                  }}>
                    <Text style={{ fontSize: 14 }}>
                      {craftResult.sinki.properties.ability || 'Особые свойства активированы'}
                    </Text>
                  </div>
                )}
                <Text style={{ color: 'var(--text_secondary)' }}>
                  {craftResult.message}
                </Text>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>😔</div>
                <Text style={{ fontSize: 16, marginBottom: 16 }}>
                  {craftResult.message}
                </Text>
                {craftResult.materialsReturned && (
                  <Text style={{ color: 'var(--text_secondary)' }}>
                    Возвращено {craftResult.materialsReturned}% материалов
                  </Text>
                )}
              </div>
            )}
          </Div>
        )}
      </ModalCard>
    </ModalRoot>
  );

  return (
    <Div>
      {modal}

      <Card mode="shadow" style={{ marginBottom: 16, padding: 16 }}>
        <Title level="2">⚒️ Станция крафта Синки</Title>
        
        {craftStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{craftStats.totalCrafts}</Text>
              <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Попыток</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{craftStats.successfulCrafts}</Text>
              <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Успешно</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{craftStats?.successRate?.toFixed(0) || 0}%</Text>
              <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Успешность</Text>
            </div>
          </div>
        )}
      </Card>

      {error && (
        <Card mode="shadow" style={{ marginBottom: 16, padding: 16, background: 'rgba(244, 67, 54, 0.1)' }}>
          <Text style={{ color: '#F44336' }}>{error}</Text>
        </Card>
      )}

      {/* Список рецептов */}
      {recipes.length === 0 && (
        <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
          <Text style={{ color: 'var(--text_secondary)' }}>
            Нет доступных рецептов для вашего ранга.<br/>
            Повышайте ранг Проводника для доступа к новым рецептам!
          </Text>
        </Card>
      )}

      <Group header={<Header>Доступные рецепты</Header>}>
        {recipes.map(recipe => {
          const isAvailable = canCraft(recipe);
          
          return (
            <SimpleCell
              key={recipe.id}
              before={
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${getRankColor(recipe.sinki_rank)} 0%, ${getRankColor(recipe.sinki_rank)}CC 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  opacity: isAvailable ? 1 : 0.4
                }}>
                  {recipe.sinki_type === 'Осколок' ? '💠' : '🔮'}
                </div>
              }
              subtitle={
                <div>
                  <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>
                    {recipe.sinki_type} • Ранг {recipe.sinki_rank}
                  </Text>
                  <Text style={{ fontSize: 12, marginTop: 4 }}>
                    Шанс: {Math.round(recipe.success_chance_base * 100)}%
                  </Text>
                  {!isAvailable && (
                    <Text style={{ fontSize: 12, color: '#FF9800', marginTop: 4 }}>
                      ⚠️ Требуется {recipe.requires_crafter_rank} ранг
                    </Text>
                  )}
                </div>
              }
              after={
                <Button
                  size="m"
                  mode={isAvailable ? 'primary' : 'secondary'}
                  onClick={() => openRecipeModal(recipe)}
                  disabled={!isAvailable}
                >
                  Создать
                </Button>
              }
              disabled={!isAvailable}
            >
              {recipe.sinki_name}
            </SimpleCell>
          );
        })}
      </Group>

      {onClose && (
        <Button size="l" mode="secondary" onClick={onClose} stretched style={{ marginTop: 16 }}>
          Закрыть
        </Button>
      )}
    </Div>
  );
};

export default CraftingStation;

