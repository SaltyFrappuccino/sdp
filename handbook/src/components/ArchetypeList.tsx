import React from 'react';
import styles from './ArchetypeList.module.css';

interface Archetype {
  name: string;
  description: string;
  category?: string;
}

interface ArchetypeListProps {
  items: Archetype[];
  title?: string;
}

const ArchetypeList: React.FC<ArchetypeListProps> = ({ items, title }) => {
  // Группируем архетипы по категориям
  const groupedArchetypes = items.reduce((acc, archetype) => {
    const category = archetype.category || 'Общие';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(archetype);
    return acc;
  }, {} as Record<string, Archetype[]>);

  return (
    <div className={styles.container}>
      {title && <h4 className={styles.title}>{title}</h4>}
      {Object.entries(groupedArchetypes).map(([category, archetypes]) => (
        <div key={category} className={styles.categorySection}>
          <h5 className={styles.categoryTitle}>{category}</h5>
          <div className={styles.archetypeGrid}>
            {archetypes.map((archetype, index) => (
              <div key={index} className={styles.archetypeCard}>
                <h6 className={styles.archetypeName}>{archetype.name}</h6>
                <p className={styles.archetypeDescription}>{archetype.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArchetypeList;

