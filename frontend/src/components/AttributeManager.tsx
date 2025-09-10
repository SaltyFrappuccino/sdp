import { FC, useMemo } from 'react';
import { FormItem, Select, Header, Text } from '@vkontakte/vkui';

const attributesList = [
    {
        name: "Сила",
        description: "Физическая мощь, способность поднимать тяжести и наносить урон в ближнем бою.",
        masterDescription: "Мастер: Способен оторвать от земли легкий мотоцикл или вырвать из стены стальную арматуру."
    },
    {
        name: "Реакция",
        description: "Рефлексы, скорость ответа на внезапную угрозу.",
        masterDescription: "Мастер: Рефлексы на грани человеческого понимания, способен инстинктивно увернуться от выстрела в упор (не от пули, а от движения оружия)."
    },
    {
        name: "Ловкость",
        description: "Акробатика, паркур, гибкость, координация и умение управлять своим телом в пространстве.",
        masterDescription: "Мастер: Способен на нечеловеческие акробатические трюки, пробежать по стене несколько шагов или спрыгнуть с третьего этажа, приземлившись на ноги."
    },
    {
        name: "Выносливость",
        description: "Стойкость, способность выдерживать боль, яды и длительные физические нагрузки.",
        masterDescription: "Мастер: Может продолжать эффективно действовать даже с тяжелыми, но не смертельными ранениями, обладает почти иммунитетом к обычным ядам и токсинам."
    },
    {
        name: "Меткость",
        description: "Умение обращаться с дальнобойным оружием (пистолеты, винтовки, луки, метательные ножи).",
        masterDescription: "Мастер: Способен на \"невозможные\" выстрелы: попасть в монету, подброшенную в воздух, или поразить несколько целей одной очередью."
    },
    {
        name: "Рукопашный Бой",
        description: "Навыки боя без оружия или с кастетами/когтями.",
        masterDescription: "Мастер: Универсальный боец, чье тело само по себе является смертоносным оружием, способный в одиночку одолеть группу вооруженных противников."
    },
    {
        name: "Холодное Оружие",
        description: "Умение обращаться с ножами, мечами, топорами, копьями и т.д.",
        masterDescription: "Мастер: Легендарный фехтовальщик или мечник, способный отбивать пули клинком."
    },
    {
        name: "Техника",
        description: "Навыки работы с технологиями, взлом замков (механических и электронных), инженерия и кибернетика.",
        masterDescription: "Мастер: Способен взломать военные серверы, перепрограммировать охранных роботов на лету или собрать из запчастей высокотехнологичное устройство."
    },
    {
        name: "Восприятие",
        description: "Внимательность, интуиция, способность замечать детали и анализировать окружение.",
        masterDescription: "Мастер: Обладает почти сверхъестественным чутьем. Способен по мельчайшим деталям (температура воздуха, вибрация пола) определить присутствие скрытого врага или распознать сложнейшую иллюзию."
    },
    {
        name: "Скрытность",
        description: "Умение передвигаться незаметно, прятаться и маскироваться в любой среде.",
        masterDescription: "Мастер: Способен стать практически невидимым даже на открытой местности, сливаясь с окружением, его шаги не производят звука."
    }
];

const attributeLevels = [
  { label: 'Дилетант (1 очко)', value: 'Дилетант', cost: 1 },
  { label: 'Новичок (2 очка)', value: 'Новичок', cost: 2 },
  { label: 'Опытный (4 очка)', value: 'Опытный', cost: 4 },
  { label: 'Эксперт (7 очков)', value: 'Эксперт', cost: 7 },
  { label: 'Мастер (10 очков)', value: 'Мастер', cost: 10 },
];

const attributeCosts: { [key: string]: number } = {
  "Дилетант": 1, "Новичок": 2, "Опытный": 4, "Эксперт": 7, "Мастер": 10
};

interface AttributeManagerProps {
  attributes: { [key: string]: string };
  onAttributeChange: (name: string, value: string) => void;
  totalPoints: number;
}

export const AttributeManager: FC<AttributeManagerProps> = ({ attributes, onAttributeChange, totalPoints }) => {
  const spentPoints = useMemo(() => {
    return Object.values(attributes).reduce((acc, level) => acc + (attributeCosts[level] || 0), 0);
  }, [attributes]);

  const remainingPoints = totalPoints - spentPoints;

  return (
    <>
      <Header>Атрибуты</Header>
      <FormItem>
        <Text>
          Вы получаете <b>{totalPoints}</b> очков для распределения.
          <br />
          Потрачено: <b>{spentPoints}</b>
          <br />
          Осталось: <b style={{ color: remainingPoints < 0 ? 'var(--vkui--color_text_negative)' : 'inherit' }}>{remainingPoints}</b>
        </Text>
        {remainingPoints < 0 && (
            <Text style={{ color: 'var(--vkui--color_text_negative)', marginTop: '8px' }}>
                Превышен лимит очков!
            </Text>
        )}
      </FormItem>

      {attributesList.map(attr => (
        <FormItem top={attr.name} key={attr.name}>
          <Text style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
            {attr.description}
            <br/>
            <i>{attr.masterDescription}</i>
          </Text>
          <Select
            placeholder="Выберите уровень"
            value={attributes[attr.name] || 'Дилетант'}
            onChange={(e) => onAttributeChange(attr.name, e.target.value)}
            options={attributeLevels.map(level => ({ label: level.label, value: level.value }))}
          />
        </FormItem>
      ))}
    </>
  );
};