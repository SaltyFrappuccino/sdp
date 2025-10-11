import { FC } from 'react';
import { FormItem, Input, Textarea, Header, Div, Card, Separator } from '@vkontakte/vkui';
import { HandbookTooltip } from './HandbookTooltip';
import { HANDBOOK_TOOLTIPS } from '../utils/handbookHelpers';

interface DominionData {
  name: string;
  environment_description: string;
  law_name: string;
  law_description: string;
  tactical_effects: string;
}

interface DominionFormProps {
  dominion: DominionData;
  onChange: (field: keyof DominionData, value: string) => void;
}

export const DominionForm: FC<DominionFormProps> = ({ dominion, onChange }) => {
  return (
    <Card mode="shadow" style={{ marginTop: '12px' }}>
      <Header style={{ backgroundColor: 'var(--vkui--color_background_accent_alpha)', color: 'var(--vkui--color_text_primary)', padding: '12px', display: 'flex', alignItems: 'center' }}>
        🌌 Доминион (100% Синхронизации)
        <HandbookTooltip
          tooltipText={HANDBOOK_TOOLTIPS.dominion.text}
          handbookSection={HANDBOOK_TOOLTIPS.dominion.section}
        />
      </Header>
      <Div>
        <FormItem top="Название Доминиона">
          <Input
            placeholder="Например: «Хроносфера Застывшего Мгновения», «Арена Вечной Битвы»..."
            value={dominion.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </FormItem>
        
        <Separator />
        
        <FormItem top="Архитектура Подпространства">
          <Textarea
            placeholder="Как выглядит ваш карманный мир? Ландшафт, архитектура, атмосфера, особенности окружения..."
            value={dominion.environment_description}
            onChange={(e) => onChange('environment_description', e.target.value)}
            rows={3}
          />
        </FormItem>
        
        <Separator />
        
        <FormItem top="Название Закона">
          <Input
            placeholder="Например: «Власть над потоком», «Только сталь и плоть», «Не верь глазам своим»..."
            value={dominion.law_name}
            onChange={(e) => onChange('law_name', e.target.value)}
          />
        </FormItem>
        
        <FormItem top="Описание Закона">
          <Textarea
            placeholder="Какие абсолютные правила действуют в вашем Доминионе? Как они влияют на всех внутри?"
            value={dominion.law_description}
            onChange={(e) => onChange('law_description', e.target.value)}
            rows={3}
          />
        </FormItem>
        
        <Separator />
        
        <FormItem top="Тактические Эффекты">
          <Textarea
            placeholder="Какие преимущества вы получаете? Как Доминион помогает в бою? Какие ограничения накладывает на врагов?"
            value={dominion.tactical_effects}
            onChange={(e) => onChange('tactical_effects', e.target.value)}
            rows={3}
          />
        </FormItem>
      </Div>
    </Card>
  );
};

export type { DominionData };
