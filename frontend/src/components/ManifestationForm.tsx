import { FC } from 'react';
import { FormItem, Textarea, Header, Div, Card, Separator, Select, Text } from '@vkontakte/vkui';

interface ManifestationData {
  modus: 'Аватар' | 'Проекция' | 'Вооружение' | 'Слияние' | '';
  avatar_description: string;
  passive_enhancement: string;
  ultimate_technique: string;
}

interface ManifestationFormProps {
  manifestation: ManifestationData;
  onChange: (field: keyof ManifestationData, value: string) => void;
}

const modusDescriptions = {
  'Аватар': {
    concept: 'Проводник призывает автономное, физически реальное существо, которое действует как его напарник.',
    passive: 'Тактическое Превосходство. Пока Аватар на поле, он действует одновременно с Проводником. В один пост и игрок, и его Аватар могут совершить по полноценному действию (атака, защита, использование Малой/Значительной ячейки).'
  },
  'Проекция': {
    concept: 'Вокруг или рядом с Проводником появляется конструкция из концентрированной Ауры, которая действует как продолжение его тела и воли.',
    passive: 'Энергетический Буфер и Усиление Масштаба. Проекция служит либо как дополнительный слой защиты, либо как катализатор для усиления. Проекция может защищать Проводника собой, дабы оный не получал прямого урона. Кроме того, все атаки Проводника могут проводиться через Проекцию, значительно увеличивая их масштаб ([Область]), силу ([Пробивающий]) или что ещё.'
  },
  'Вооружение': {
    concept: 'Манифестация материализует в руках, на теле или рядом с Проводником уникальный Синки.',
    passive: 'Концептуальное Преимущество. Пока Вооружение активно, оно наделяет Проводника уникальными свойствами. Его атаки могут получить дополнительный Тег (например, "игнорирует регенерацию"), а защита может получить абсолютную устойчивость к определённому типу урона (например, "полный иммунитет к огню").'
  },
  'Слияние': {
    concept: 'Проводник не призывает ничего внешнего, а трансформирует собственное тело, сливаясь со своим Существом.',
    passive: 'Преодоление Пределов. В форме Слияния Проводник получает колоссальный бонус к своим физическим Атрибутам. Он также может получить уникальные физиологические способности.'
  },
};


export const ManifestationForm: FC<ManifestationFormProps> = ({ manifestation, onChange }) => {
  const selectedModus = manifestation.modus;
  const description = selectedModus ? modusDescriptions[selectedModus] : null;

  return (
    <Card mode="shadow" style={{ marginTop: '12px' }}>
      <Header style={{ backgroundColor: 'var(--vkui--color_background_accent_alpha)', color: 'var(--vkui--color_text_primary)', padding: '12px' }}>
        ⚡ Манифестация (75% Синхронизации)
      </Header>
      <Div>
        <FormItem top="Модус Манифестации">
          <Select
            placeholder="Выберите Модус"
            value={manifestation.modus}
            onChange={(e) => onChange('modus', e.target.value)}
            options={[
              { label: 'Аватар', value: 'Аватар' },
              { label: 'Проекция', value: 'Проекция' },
              { label: 'Вооружение', value: 'Вооружение' },
              { label: 'Слияние', value: 'Слияние' },
            ]}
          />
        </FormItem>

        {description && (
          <Div style={{ padding: '12px', background: 'var(--vkui--color_background_secondary)', borderRadius: '8px' }}>
            <Text weight="1" style={{ marginBottom: '8px' }}><b>Концепция:</b> {description.concept}</Text>
            <Text><b>Пассивное Усиление:</b> {description.passive}</Text>
          </Div>
        )}
        
        <FormItem top="Описание Манифестации">
          <Textarea
            placeholder="Опишите, как выглядит Манифестация в соответствии с выбранным Модусом (Аватар, Проекция, Вооружение или Слияние)."
            value={manifestation.avatar_description}
            onChange={(e) => onChange('avatar_description', e.target.value)}
            rows={3}
          />
        </FormItem>
        
        <Separator />
        
        <FormItem top="Пассивное Усиление (уточнение)">
          <Textarea
            placeholder="Если у вашего пассивного усиления есть уникальные детали, опишите их здесь. Например, для Вооружения - какой Концептуальный Тег оно дает."
            value={manifestation.passive_enhancement}
            onChange={(e) => onChange('passive_enhancement', e.target.value)}
            rows={3}
          />
        </FormItem>
        
        <Separator />
        
        <FormItem top="Предельная Техника">
          <Textarea
            placeholder="Опишите мощнейшую атаку, которую может выполнить Манифестация за Предельную Ячейку..."
            value={manifestation.ultimate_technique}
            onChange={(e) => onChange('ultimate_technique', e.target.value)}
            rows={3}
          />
        </FormItem>
      </Div>
    </Card>
  );
};

export type { ManifestationData };
