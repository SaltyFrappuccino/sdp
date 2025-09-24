import React from 'react';
import styles from './Breadcrumbs.module.css';

interface BreadcrumbsProps {
  bookType: 'lore' | 'character' | 'combat';
  chapterTitle: string;
  onBookClick: (bookType: 'lore' | 'character' | 'combat') => void;
}

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

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ bookType, chapterTitle, onBookClick }) => {
  return (
    <nav className={styles.breadcrumbs} aria-label="Навигация">
      <ol className={styles.list}>
        <li className={styles.item}>
          <button
            className={styles.bookLink}
            onClick={() => onBookClick(bookType)}
            title={`Перейти к ${bookNames[bookType]}`}
          >
            <span className={styles.icon}>{bookIcons[bookType]}</span>
            <span className={styles.bookName}>{bookNames[bookType]}</span>
          </button>
        </li>
        <li className={styles.separator} aria-hidden="true">
          <span className={styles.arrow}>›</span>
        </li>
        <li className={styles.item}>
          <span className={styles.chapterTitle}>{chapterTitle}</span>
        </li>
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
