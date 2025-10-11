import { FC, useState, useEffect } from 'react';
import { FormItem, Checkbox, Input, Header, Div } from '@vkontakte/vkui';
import { HandbookTooltip } from './HandbookTooltip';
import { HANDBOOK_TOOLTIPS } from '../utils/handbookHelpers';

interface ActivationConditionsProps {
  conditions?: {
    verbal?: string;
    gesture?: string;
    general?: string;
  };
  onChange: (conditions: { verbal?: string; gesture?: string; general?: string }) => void;
}

export const ActivationConditions: FC<ActivationConditionsProps> = ({ conditions, onChange }) => {
  const [hasVerbal, setHasVerbal] = useState(!!conditions?.verbal);
  const [hasGesture, setHasGesture] = useState(!!conditions?.gesture);
  const [verbalText, setVerbalText] = useState(conditions?.verbal || '');
  const [gestureText, setGestureText] = useState(conditions?.gesture || '');
  const [generalText, setGeneralText] = useState(conditions?.general || '');

  // Синхронизация с внешними изменениями
  useEffect(() => {
    setHasVerbal(!!conditions?.verbal);
    setHasGesture(!!conditions?.gesture);
    setVerbalText(conditions?.verbal || '');
    setGestureText(conditions?.gesture || '');
    setGeneralText(conditions?.general || '');
  }, [conditions]);

  const updateConditions = (
    newVerbal?: string,
    newGesture?: string,
    newGeneral?: string,
    verbalEnabled?: boolean,
    gestureEnabled?: boolean
  ) => {
    const result: { verbal?: string; gesture?: string; general?: string } = {};
    
    // Добавляем только непустые значения
    if (verbalEnabled && newVerbal?.trim()) {
      result.verbal = newVerbal.trim();
    }
    
    if (gestureEnabled && newGesture?.trim()) {
      result.gesture = newGesture.trim();
    }
    
    if (newGeneral?.trim()) {
      result.general = newGeneral.trim();
    }
    
    onChange(result);
  };

  const handleVerbalCheckbox = (checked: boolean) => {
    setHasVerbal(checked);
    if (!checked) {
      setVerbalText('');
      updateConditions('', gestureText, generalText, false, hasGesture);
    } else {
      updateConditions(verbalText, gestureText, generalText, true, hasGesture);
    }
  };

  const handleGestureCheckbox = (checked: boolean) => {
    setHasGesture(checked);
    if (!checked) {
      setGestureText('');
      updateConditions(verbalText, '', generalText, hasVerbal, false);
    } else {
      updateConditions(verbalText, gestureText, generalText, hasVerbal, true);
    }
  };

  const handleVerbalTextChange = (value: string) => {
    setVerbalText(value);
    updateConditions(value, gestureText, generalText, hasVerbal, hasGesture);
  };

  const handleGestureTextChange = (value: string) => {
    setGestureText(value);
    updateConditions(verbalText, value, generalText, hasVerbal, hasGesture);
  };

  const handleGeneralTextChange = (value: string) => {
    setGeneralText(value);
    updateConditions(verbalText, gestureText, value, hasVerbal, hasGesture);
  };

  return (
    <Div style={{ background: 'var(--vkui--color_background_secondary)', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 0 8px 0' }}>
        Условия активации способности
        <HandbookTooltip
          tooltipText={HANDBOOK_TOOLTIPS.activationConditions.text}
          handbookSection={HANDBOOK_TOOLTIPS.activationConditions.section}
        />
      </Header>
      
      <FormItem>
        <Checkbox
          checked={hasVerbal}
          onChange={(e) => handleVerbalCheckbox(e.target.checked)}
          description="Необходимо произнести слова или фразу для активации"
        >
          🗣️ Вербальная активация
        </Checkbox>
      </FormItem>

      {hasVerbal && (
        <FormItem top="Слова/Фраза активации">
          <Input
            placeholder='Например: "Пылай!", "Flames of destruction" или заклинание'
            value={verbalText}
            onChange={(e) => handleVerbalTextChange(e.target.value)}
          />
        </FormItem>
      )}

      <FormItem>
        <Checkbox
          checked={hasGesture}
          onChange={(e) => handleGestureCheckbox(e.target.checked)}
          description="Необходим жест рукой, телом или оружием"
        >
          ✋ Жест
        </Checkbox>
      </FormItem>

      {hasGesture && (
        <FormItem top="Описание жеста">
          <Input
            placeholder='Например: "Взмах рукой" или "Удар мечом по земле"'
            value={gestureText}
            onChange={(e) => handleGestureTextChange(e.target.value)}
          />
        </FormItem>
      )}

      <FormItem 
        top="Дополнительное условие (опционально)"
        bottom="Любое другое условие активации, например: только ночью, требует жертву, работает раз в день и т.д."
      >
        <Input
          placeholder='Например: "Только при лунном свете" или "Требует касания цели"'
          value={generalText}
          onChange={(e) => handleGeneralTextChange(e.target.value)}
        />
      </FormItem>
    </Div>
  );
};

