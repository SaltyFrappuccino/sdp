import React, { useState } from 'react';
import styles from './QuickLinks.module.css';

interface QuickLink {
  id: string;
  title: string;
  bookType: 'lore' | 'character' | 'combat';
  chapterId: string;
  headingId?: string;
  description: string;
  icon: string;
}

interface QuickLinksProps {
  currentBookType: 'lore' | 'character' | 'combat';
  currentChapterId: string;
  onLinkClick: (bookType: 'lore' | 'character' | 'combat', chapterId: string, headingId?: string) => void;
}

const quickLinks: QuickLink[] = [
  // Основы персонажа
  {
    id: 'character-basics',
    title: 'Основы Персонажа',
    bookType: 'character',
    chapterId: 'character-basics',
    description: 'Создание и настройка персонажа',
    icon: '👤'
  },
  {
    id: 'ranks-system',
    title: 'Система Рангов',
    bookType: 'character',
    chapterId: 'ranks-system',
    description: 'Ранги Существ и их характеристики',
    icon: '⭐'
  },
  {
    id: 'attributes',
    title: 'Атрибуты',
    bookType: 'character',
    chapterId: 'attributes',
    description: 'Основные характеристики персонажа',
    icon: '📊'
  },
  {
    id: 'archetypes',
    title: 'Архетипы',
    bookType: 'character',
    chapterId: 'archetypes',
    description: 'Типы Существ и их особенности',
    icon: '🎭'
  },
  
  // Боевая система
  {
    id: 'combat-basics',
    title: 'Основы Боя',
    bookType: 'combat',
    chapterId: 'combat-basics',
    description: 'Базовые правила боевой системы',
    icon: '⚔️'
  },
  {
    id: 'dominion',
    title: 'Доминион',
    bookType: 'combat',
    chapterId: 'dominion',
    description: 'Создание и использование Доминиона',
    icon: '🏰'
  },
  {
    id: 'manifestation',
    title: 'Манифестация',
    bookType: 'combat',
    chapterId: 'manifestation',
    description: 'Способы проявления способностей',
    icon: '✨'
  },
  {
    id: 'tags-system',
    title: 'Система Тегов',
    bookType: 'combat',
    chapterId: 'tags-system',
    description: 'Теги и их стоимость',
    icon: '🏷️'
  },
  
  // Лор и мир
  {
    id: 'world-history',
    title: 'История Мира',
    bookType: 'lore',
    chapterId: 'world-history',
    description: 'История мира и Разлом',
    icon: '🌍'
  },
  {
    id: 'factions',
    title: 'Фракции',
    bookType: 'lore',
    chapterId: 'factions',
    description: 'Основные фракции мира',
    icon: '🏛️'
  },
  {
    id: 'creatures',
    title: 'Существа',
    bookType: 'lore',
    chapterId: 'creatures',
    description: 'Типы Существ и их ранги',
    icon: '👹'
  },
  {
    id: 'conductors',
    title: 'Проводники',
    bookType: 'lore',
    chapterId: 'conductors',
    description: 'Проводники и контракты',
    icon: '🤝'
  }
];

const QuickLinks: React.FC<QuickLinksProps> = ({ 
  currentBookType, 
  currentChapterId, 
  onLinkClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Фильтруем ссылки, исключая текущую главу
  const filteredLinks = quickLinks.filter(link => 
    !(link.bookType === currentBookType && link.chapterId === currentChapterId)
  );

  // Группируем по книгам
  const groupedLinks = filteredLinks.reduce((acc, link) => {
    if (!acc[link.bookType]) {
      acc[link.bookType] = [];
    }
    acc[link.bookType].push(link);
    return acc;
  }, {} as Record<string, QuickLink[]>);

  const bookNames = {
    lore: 'Лор и Мир',
    character: 'Основы Персонажа',
    combat: 'Боевая Система'
  };

  const bookIcons = {
    lore: '🌍',
    character: '👤',
    combat: '⚔️'
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Скрыть быстрые ссылки' : 'Показать быстрые ссылки'}
      >
        <span className={styles.icon}>🔗</span>
        <span className={styles.text}>Быстрые ссылки</span>
        <span className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className={styles.linksContainer}>
          {Object.entries(groupedLinks).map(([bookType, links]) => (
            <div key={bookType} className={styles.bookGroup}>
              <div className={styles.bookHeader}>
                <span className={styles.bookIcon}>{bookIcons[bookType as keyof typeof bookIcons]}</span>
                <span className={styles.bookName}>{bookNames[bookType as keyof typeof bookNames]}</span>
              </div>
              <div className={styles.linksList}>
                {links.map(link => (
                  <button
                    key={link.id}
                    className={styles.linkButton}
                    onClick={() => onLinkClick(link.bookType, link.chapterId, link.headingId)}
                    title={link.description}
                  >
                    <span className={styles.linkIcon}>{link.icon}</span>
                    <div className={styles.linkContent}>
                      <span className={styles.linkTitle}>{link.title}</span>
                      <span className={styles.linkDescription}>{link.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickLinks;
