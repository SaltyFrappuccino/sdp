import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Div, Button, Spinner, Group, Header, SimpleCell, Avatar, NativeSelect } from '@vkontakte/vkui';
import bridge from '@vkontakte/vk-bridge';
import { API_URL } from '../api';

interface Material {
  id: number;
  material_id: number;
  name: string;
  material_type: 'organic' | 'essence' | 'crystal' | 'metal' | 'special';
  mutation_class: 'Затронутые' | 'Искажённые' | 'Бестии';
  rarity_tier: number; // 1-5
  quantity: number;
  quality_modifier: number; // 0.5-2.0
  credit_value: number;
  description?: string;
}

interface MaterialsInventoryProps {
  characterId: number;
  onClose?: () => void;
}

const MaterialsInventory: React.FC<MaterialsInventoryProps> = ({ characterId, onClose }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rarity');

  useEffect(() => {
    fetchMaterials();
  }, [characterId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/materials/${characterId}`);
      const data = await response.json();
      
      // API может возвращать массив напрямую или объект с полем materials
      setMaterials(Array.isArray(data) ? data : (data.materials || []));
    } catch (err) {
      setError('Ошибка загрузки материалов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMaterialTypeIcon = (type: string) => {
    switch (type) {
      case 'organic':
        return '🥩';
      case 'essence':
        return '✨';
      case 'crystal':
        return '💎';
      case 'metal':
        return '⚙️';
      case 'special':
        return '⭐';
      default:
        return '📦';
    }
  };

  const getMaterialTypeColor = (type: string) => {
    switch (type) {
      case 'organic':
        return '#8BC34A';
      case 'essence':
        return '#9C27B0';
      case 'crystal':
        return '#03A9F4';
      case 'metal':
        return '#607D8B';
      case 'special':
        return '#FFC107';
      default:
        return '#9E9E9E';
    }
  };

  const getMutationClassColor = (mutationClass: string) => {
    switch (mutationClass) {
      case 'Затронутые':
        return '#4CAF50';
      case 'Искажённые':
        return '#FF9800';
      case 'Бестии':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getRarityStars = (tier: number) => {
    return '⭐'.repeat(tier);
  };

  const getQualityText = (quality: number) => {
    if (quality >= 1.5) return '🏆 Превосходное';
    if (quality >= 1.2) return '✨ Отличное';
    if (quality >= 1.0) return '✓ Хорошее';
    if (quality >= 0.8) return '- Среднее';
    return '↓ Низкое';
  };

  const filteredAndSortedMaterials = materials
    .filter(m => {
      if (filterType !== 'all' && m.material_type !== filterType) return false;
      if (filterClass !== 'all' && m.mutation_class !== filterClass) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rarity':
          return b.rarity_tier - a.rarity_tier;
        case 'quantity':
          return b.quantity - a.quantity;
        case 'value':
          return b.credit_value * b.quantity - a.credit_value * a.quantity;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const groupedMaterials = filteredAndSortedMaterials.reduce((acc, material) => {
    const type = material.material_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  const totalValue = materials.reduce((sum, m) => sum + (m.credit_value * m.quantity), 0);
  const uniqueTypes = materials.reduce((acc, m) => {
    acc.add(m.material_type);
    return acc;
  }, new Set<string>()).size;

  if (loading) {
    return (
      <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="l" />
      </Div>
    );
  }

  if (error) {
    return (
      <Div>
        <Text style={{ color: 'var(--destructive)', marginBottom: 16 }}>{error}</Text>
        <Button onClick={fetchMaterials}>Повторить</Button>
      </Div>
    );
  }

  return (
    <Div>
      <Card mode="shadow" style={{ marginBottom: 16, padding: 16 }}>
        <Title level="2">📦 Инвентарь материалов</Title>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{materials.length}</Text>
            <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Стаков</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{uniqueTypes}</Text>
            <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Типов</Text>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{(totalValue / 1000).toFixed(0)}к₭</Text>
            <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Ценность</Text>
          </div>
        </div>
      </Card>

      {/* Фильтры и сортировка */}
      <Card mode="shadow" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <Text weight="2" style={{ marginBottom: 8 }}>Фильтры</Text>
          
          <NativeSelect
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ marginBottom: 8 }}
          >
            <option value="all">Все типы</option>
            <option value="organic">🥩 Органика</option>
            <option value="essence">✨ Эссенция</option>
            <option value="crystal">💎 Кристаллы</option>
            <option value="metal">⚙️ Металл</option>
            <option value="special">⭐ Особое</option>
          </NativeSelect>

          <NativeSelect
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            style={{ marginBottom: 8 }}
          >
            <option value="all">Все классы</option>
            <option value="Затронутые">Затронутые</option>
            <option value="Искажённые">Искажённые</option>
            <option value="Бестии">Бестии</option>
          </NativeSelect>

          <NativeSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="rarity">По редкости</option>
            <option value="quantity">По количеству</option>
            <option value="value">По ценности</option>
            <option value="name">По названию</option>
          </NativeSelect>
        </div>
      </Card>

      {/* Список материалов по группам */}
      {Object.keys(groupedMaterials).length === 0 && (
        <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
          <Text style={{ color: 'var(--text_secondary)' }}>
            У вас пока нет материалов.<br/>
            Отправляйтесь на охоту или рыбалку!
          </Text>
        </Card>
      )}

      {Object.entries(groupedMaterials).map(([type, mats]) => (
        <Group key={type} header={<Header>{getMaterialTypeIcon(type)} {type.toUpperCase()}</Header>}>
          {mats.map(material => (
            <SimpleCell
              key={material.id}
              before={
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${getMaterialTypeColor(material.material_type)} 0%, ${getMaterialTypeColor(material.material_type)}CC 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24
                }}>
                  {getMaterialTypeIcon(material.material_type)}
                </div>
              }
              subtitle={
                <div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ 
                      color: getMutationClassColor(material.mutation_class),
                      fontWeight: 'bold',
                      fontSize: 12
                    }}>
                      {material.mutation_class}
                    </span>
                    {' • '}
                    <span>{getRarityStars(material.rarity_tier)}</span>
                    {' • '}
                    <span>{getQualityText(material.quality_modifier)}</span>
                  </div>
                  {material.description && (
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)', marginTop: 4 }}>
                      {material.description}
                    </Text>
                  )}
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    Ценность: <span style={{ fontWeight: 'bold' }}>{(material.credit_value * material.quantity).toLocaleString()}₭</span>
                  </div>
                </div>
              }
              after={
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold' }}>×{material.quantity}</Text>
                  <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>
                    {material.credit_value.toLocaleString()}₭
                  </Text>
                </div>
              }
            >
              {material.name}
            </SimpleCell>
          ))}
        </Group>
      ))}

      {onClose && (
        <Button size="l" mode="secondary" onClick={onClose} stretched style={{ marginTop: 16 }}>
          Закрыть
        </Button>
      )}
    </Div>
  );
};

export default MaterialsInventory;

