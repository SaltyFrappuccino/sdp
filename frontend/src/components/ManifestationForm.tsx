import { FC } from 'react';
import { FormItem, Input, Textarea, Header, Div, Card, Separator } from '@vkontakte/vkui';

interface ManifestationData {
  avatar_description: string;
  passive_enhancement: string;
  ultimate_technique: string;
}

interface ManifestationFormProps {
  manifestation: ManifestationData;
  onChange: (field: keyof ManifestationData, value: string) => void;
}

export const ManifestationForm: FC<ManifestationFormProps> = ({ manifestation, onChange }) => {
  return (
    <Card mode="shadow" style={{ marginTop: '12px' }}>
      <Header style={{ backgroundColor: 'var(--vkui--color_background_accent_alpha)', color: 'var(--vkui--color_text_primary)', padding: '12px' }}>
        ⚡ Манифестация (75% Синхронизации)
      </Header>
      <Div>
        <FormItem top="Описание Аватара">
          <Textarea
            placeholder="Как выглядит призываемый аватар Существа? Опишите его внешность, размер, особенности..."
            value={manifestation.avatar_description}
            onChange={(e) => onChange('avatar_description', e.target.value)}
            rows={3}
          />
        </FormItem>
        
        <Separator />
        
        <FormItem top="Пассивное Усиление (Резонанс Силы)">
          <Textarea
            placeholder="Какие бонусы получает Проводник, пока Манифестация активна? Как усиливаются его способности?"
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
