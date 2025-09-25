import React from 'react';
import styles from './TagDisplay.module.css';

interface Tag {
  name: string;
  rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
  cost: number;
  description: string;
  examples: string[];
  category: 'attack' | 'defense' | 'utility' | 'control' | 'support';
}

interface TagDisplayProps {
  tags: Tag[];
  title?: string;
}

const TagDisplay: React.FC<TagDisplayProps> = ({ tags, title }) => {
  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'F': return '#9E9E9E';
      case 'E': return '#4CAF50';
      case 'D': return '#2196F3';
      case 'C': return '#9C27B0';
      case 'B': return '#FF9800';
      case 'A': return '#F44336';
      case 'S': return '#E91E63';
      case 'SS': return '#673AB7';
      case 'SSS': return '#FFD700';
      default: return '#451ecf';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attack': return '⚔️';
      case 'defense': return '🛡️';
      case 'utility': return '🔧';
      case 'control': return '🎯';
      case 'support': return '💚';
      default: return '⭐';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'attack': return 'Атака';
      case 'defense': return 'Защита';
      case 'utility': return 'Утилита';
      case 'control': return 'Контроль';
      case 'support': return 'Поддержка';
      default: return category;
    }
  };

  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.tagsGrid}>
        {tags.map((tag, index) => (
          <div key={index} className={styles.tagCard}>
            <div className={styles.tagHeader}>
              <div className={styles.tagInfo}>
                <span className={styles.categoryIcon}>{getCategoryIcon(tag.category)}</span>
                <span className={styles.tagName}>[{tag.name}]</span>
                <span 
                  className={styles.rank}
                  style={{ color: getRankColor(tag.rank) }}
                >
                  {tag.rank}
                </span>
              </div>
              <div className={styles.cost}>
                <span className={styles.costLabel}>Стоимость:</span>
                <span className={styles.costValue}>{tag.cost}</span>
              </div>
            </div>
            
            <div className={styles.description}>
              {tag.description}
            </div>
            
            <div className={styles.examples}>
              <h4 className={styles.examplesTitle}>Примеры:</h4>
              <ul className={styles.examplesList}>
                {tag.examples.map((example, i) => (
                  <li key={i} className={styles.exampleItem}>{example}</li>
                ))}
              </ul>
            </div>
            
            <div className={styles.category}>
              <span className={styles.categoryLabel}>Категория:</span>
              <span className={styles.categoryName}>{getCategoryName(tag.category)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagDisplay;
