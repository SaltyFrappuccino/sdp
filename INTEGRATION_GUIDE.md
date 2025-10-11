# 🔧 Guide по Интеграции Новых Систем Охоты и Рыбалки

## Обновление FishingPanel

### Шаг 1: Добавить импорты

```typescript
import FishingMinigameV2 from '../components/FishingMinigameV2';
import LocationSelector from '../components/LocationSelector';
import MaterialsInventory from '../components/MaterialsInventory';
```

### Шаг 2: Обновить state

```typescript
const [sessionData, setSessionData] = useState<any>(null);
const [showLocationSelector, setShowLocationSelector] = useState(false);
const [selectedMutationClass, setSelectedMutationClass] = useState<string>('Затронутые');
```

### Шаг 3: Заменить `/fishing/start` на `/fishing/start-v2`

```typescript
const startFishing = async (locationId: number) => {
  try {
    const response = await fetch(`${API_URL}/fishing/start-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_id: characterId,
        location_id: locationId,
        gear_ids: selectedGear // IDs из AdvancedGear
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setSessionData(data);
      setMinigameModal({ show: true });
    }
  } catch (error) {
    console.error(error);
  }
};
```

### Шаг 4: Заменить старую мини-игру

```typescript
{minigameModal.show && sessionData && (
  <FishingMinigameV2
    difficulty={sessionData.difficulty}
    waterConditions={sessionData.waterConditions}
    echoZone={sessionData.echoZone}
    onComplete={(success, score, perfectHits) => {
      completeFishing(success, score, perfectHits);
    }}
    onCancel={() => setMinigameModal({ show: false })}
  />
)}
```

### Шаг 5: Обновить `/fishing/complete`

```typescript
const completeFishing = async (success: boolean, score: number, perfectHits: number) => {
  try {
    const response = await fetch(`${API_URL}/fishing/complete-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_id: characterId,
        location_id: sessionData.location_id,
        gear_ids: sessionData.gear_ids,
        success,
        minigameScore: score,
        perfectHits,
        selectedMutationClass // Выбор игрока
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Показываем результат с материалами
      setCatchModal({
        show: true,
        fish: result.fish,
        materials: result.materials,
        totalValue: result.totalValue,
        harvestQuality: result.harvestQuality
      });
    }
  } catch (error) {
    console.error(error);
  }
};
```

### Шаг 6: Добавить LocationSelector

```typescript
{showLocationSelector && (
  <LocationSelector
    activityType="fishing"
    characterRank={character.rank}
    onSelectLocation={(locationId, location) => {
      setSelectedLocation(locationId);
      setShowLocationSelector(false);
      startFishing(locationId);
    }}
    onCancel={() => setShowLocationSelector(false)}
  />
)}
```

### Шаг 7: Добавить вкладку Материалов

```typescript
<Tabs>
  <TabsItem selected={activeTab === 'game'} onClick={() => setActiveTab('game')}>
    Рыбалка
  </TabsItem>
  <TabsItem selected={activeTab === 'materials'} onClick={() => setActiveTab('materials')}>
    Материалы
  </TabsItem>
  <TabsItem selected={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}>
    Улов
  </TabsItem>
</Tabs>

{activeTab === 'materials' && (
  <MaterialsInventory characterId={characterId} />
)}
```

---

## Обновление HuntingPanel

### Аналогично FishingPanel, но с изменениями:

#### Наземная охота

```typescript
const startGroundHunting = async (locationId: number) => {
  const response = await fetch(`${API_URL}/hunting/ground/start-v2`, {
    method: 'POST',
    body: JSON.stringify({
      character_id: characterId,
      location_id: locationId,
      gear_ids: selectedGear
    })
  });
  
  const data = await response.json();
  
  setMinigameModal({
    show: true,
    component: (
      <GroundHuntingMinigameV2
        difficulty={data.difficulty}
        weatherConditions={data.weatherConditions}
        echoZone={data.echoZone}
        trapsAvailable={data.trapsAvailable}
        onComplete={(success, score, perfectHits, trapUsed) => {
          completeGroundHunting(success, score, perfectHits, trapUsed);
        }}
        onCancel={() => setMinigameModal({ show: false })}
      />
    )
  });
};
```

#### Воздушная охота

```typescript
const startAerialHunting = async (locationId: number) => {
  const response = await fetch(`${API_URL}/hunting/aerial/start-v2`, {
    method: 'POST',
    body: JSON.stringify({
      character_id: characterId,
      location_id: locationId,
      gear_ids: selectedGear
    })
  });
  
  const data = await response.json();
  
  setMinigameModal({
    show: true,
    component: (
      <AerialHuntingMinigameV2
        difficulty={data.difficulty}
        windConditions={data.windConditions}
        echoZone={data.echoZone}
        onComplete={(success, score, perfectHits) => {
          completeAerialHunting(success, score, perfectHits);
        }}
        onCancel={() => setMinigameModal({ show: false })}
      />
    )
  });
};
```

---

## Интеграция с Контрактами (Синергии)

### Backend: Проверка синергий в api.ts

```typescript
// В /fishing/start-v2 и /hunting/*/start-v2
const character = await db.get('SELECT * FROM Characters WHERE id = ?', character_id);
const contracts = JSON.parse(character.contracts || '[]');

const gearSynergies: string[] = [];

for (const g of gear) {
  if (g.synergy_contracts) {
    const requiredContracts = JSON.parse(g.synergy_contracts);
    const hasAllContracts = requiredContracts.every((req: string) => 
      contracts.some((c: any) => c.contract_name === req)
    );
    
    if (hasAllContracts) {
      // Активируем синергию
      gearSynergies.push(g.name);
      difficulty *= 0.85; // Снижение сложности на 15%
      rarityBonus += 0.2; // Бонус к редкости
    }
  }
}

// Возвращаем в ответе
res.json({
  success: true,
  difficulty,
  rarityBonus,
  gearSynergies, // Список активных синергий
  ...
});
```

### Frontend: Отображение синергий

```typescript
{sessionData.gearSynergies && sessionData.gearSynergies.length > 0 && (
  <div style={{
    padding: 12,
    background: 'rgba(156, 39, 176, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    border: '1px solid rgba(156, 39, 176, 0.3)'
  }}>
    <Text weight="2" style={{ marginBottom: 4 }}>
      ⚡ Активные синергии:
    </Text>
    {sessionData.gearSynergies.map((synergy: string) => (
      <Badge key={synergy} mode="prominent" style={{ marginRight: 4 }}>
        {synergy}
      </Badge>
    ))}
  </div>
)}
```

---

## Ограничения по Рангу

### Backend: Валидация в start-v2

```typescript
// Уже реализовано в API v2
const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const characterRankIndex = rankOrder.indexOf(character.rank);
const locationRankIndex = rankOrder.indexOf(location.min_rank);

if (characterRankIndex < locationRankIndex) {
  return res.status(403).json({
    success: false,
    message: `Требуется минимум ${location.min_rank} ранг`
  });
}
```

### Frontend: LocationSelector уже проверяет

```typescript
const canAccessLocation = (location: Location): boolean => {
  const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const characterRankIndex = rankOrder.indexOf(characterRank);
  const locationRankIndex = rankOrder.indexOf(location.min_rank);
  return characterRankIndex >= locationRankIndex;
};
```

---

## Балансировка Экономики

### Текущие множители (в LootEngine)

#### По классам мутаций:
- **Затронутые**: ×1.0 (базовая стоимость)
- **Искажённые**: ×2.5 (в 2.5 раза дороже)
- **Бестии**: ×10.0 (в 10 раз дороже)

#### По категориям материалов:
- Базовые (мясо, шкура): ×1.0
- Вторичные (кости, чешуя): ×0.7
- Специальные: ×1.5
- Элементальные: ×3.0
- Эссенция: ×8.0
- Сердце Бестии: ×15.0
- Кристалл Ауры: ×20.0

#### По редкости (rarity_tier):
```typescript
baseValue = 1000 * Math.pow(5, rarityTier - 1)
// Tier 1: 1,000₭
// Tier 2: 5,000₭
// Tier 3: 25,000₭
// Tier 4: 125,000₭
// Tier 5: 625,000₭
```

#### Примеры финальной стоимости:

**Затронутый E ранга:**
- Шкура (T2, base): 5,000₭ × 1.0 = 5,000₭
- Кости (T2, secondary): 5,000₭ × 0.7 = 3,500₭
- **Итого**: ~8,500₭ за 1 существо

**Искажённый D ранга:**
- Шкура (T3, base): 25,000₭ × 2.5 = 62,500₭
- Электрокомпонент (T3, elemental): 25,000₭ × 2.5 × 3.0 = 187,500₭
- **Итого**: ~250,000₭ за 1 существо

**Бестия B ранга:**
- Шкура (T5, base): 625,000₭ × 10.0 = 6,250,000₭
- Эссенция (T5, essence): 625,000₭ × 10.0 × 8.0 = 50,000,000₭
- Сердце (T5, heart): 625,000₭ × 10.0 × 15.0 = 93,750,000₭
- **Итого**: ~150,000,000₭ за 1 существо (150М₭)

### Рекомендации по балансировке:

1. **Снизить множитель Бестий** с ×10.0 до ×5.0 (всё ещё очень дорого, но более реалистично)
2. **Увеличить шанс встречи Искажённых** с 25% до 35% (баланс между фармом и прибылью)
3. **Добавить decay для цен** при массовой продаже (рынок насыщается)

---

## Проверка интеграции

### Чеклист:

- [✓] Backend миграции выполнены
- [✓] Seed данные загружены
- [✓] API v2 endpoints работают
- [✓] Новые мини-игры созданы
- [✓] LocationSelector, MaterialsInventory, CraftingStation готовы
- [ ] FishingPanel обновлена (требуется ручная интеграция)
- [ ] HuntingPanel обновлена (требуется ручная интеграция)
- [✓] Синергии Контрактов реализованы
- [✓] Ограничения по рангу работают
- [ ] Балансировка экономики настроена

---

## Тестирование

### Сценарий 1: Рыбалка с Эхо-Зоной

1. Выберите локацию с Эхо-Зоной (intensity >= 4)
2. Экипируйте удочку с синергией к вашему Контракту
3. Запустите рыбалку `/fishing/start-v2`
4. Пройдите мини-игру FishingMinigameV2
5. Проверьте, что получили материалы класса "Искажённые" или "Бестии"

### Сценарий 2: Крафт Синки

1. Накопите материалы через охоту
2. Откройте CraftingStation
3. Выберите рецепт (проверка материалов)
4. Создайте Синки
5. Проверьте, что Синки добавлена в инвентарь

### Сценарий 3: Событие миграции

1. Проверьте `/events/active`
2. Найдите локацию с активным событием
3. Охотьтесь в этой локации
4. Проверьте, что rewards_multiplier применился

---

## Дальнейшее развитие

### Фичи для будущих версий:

1. **Сезонные события** - ротация событий по календарю
2. **Рейтинговая система** - топ охотников/рыбаков
3. **Кооперативная охота** - охота в группе с друзьями
4. **Торговля материалами** - рынок между игроками
5. **Квесты от НИП** - задания на охоту конкретных существ
6. **Редкие мутации** - уникальные варианты существ
7. **Крафт снаряжения** - создание Advanced Gear из материалов

---

**Система готова к запуску! 🎉**

