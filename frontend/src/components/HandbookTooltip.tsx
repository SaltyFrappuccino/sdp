import { FC } from 'react';
import { IconButton } from '@vkontakte/vkui';
import { Icon16InfoCircle } from '@vkontakte/icons';
import { navigateToHandbookSection } from '../utils/handbookHelpers';

interface HandbookTooltipProps {
  tooltipText: string;
  handbookSection?: string;
}

export const HandbookTooltip: FC<HandbookTooltipProps> = ({ tooltipText, handbookSection }) => {
  const handleClick = () => {
    if (handbookSection) {
      navigateToHandbookSection(handbookSection);
    }
  };

  const fullTooltipText = handbookSection 
    ? `${tooltipText}\n\n📖 Нажмите, чтобы открыть справочник`
    : tooltipText;

  return (
    <span title={fullTooltipText}>
      <IconButton
        onClick={handleClick}
        style={{
          marginLeft: '4px',
          cursor: handbookSection ? 'pointer' : 'default',
        }}
        aria-label="Информация"
      >
        <Icon16InfoCircle style={{ color: 'var(--vkui--color_icon_accent)' }} />
      </IconButton>
    </span>
  );
};

