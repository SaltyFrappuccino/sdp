import React from 'react';
import styles from './ArchetypeDisplay.module.css';

interface Archetype {
  name: string;
  description: string;
  icon: string;
  role: string;
  tactics: string[];
  examples: string[];
}

interface ArchetypeDisplayProps {
  archetypes: Archetype[];
  title?: string;
}

const ArchetypeDisplay: React.FC<ArchetypeDisplayProps> = ({ archetypes, title }) => {
  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.archetypesGrid}>
        {archetypes.map((archetype, index) => (
          <div key={index} className={styles.archetypeCard}>
            <div className={styles.archetypeHeader}>
              <span className={styles.icon}>{archetype.icon}</span>
              <div className={styles.archetypeInfo}>
                <span className={styles.archetypeName}>[{archetype.name}]</span>
                <span className={styles.role}>{archetype.role}</span>
              </div>
            </div>
            
            <div className={styles.description}>
              {archetype.description}
            </div>
            
            <div className={styles.tactics}>
              <h4 className={styles.tacticsTitle}>Тактика:</h4>
              <ul className={styles.tacticsList}>
                {archetype.tactics.map((tactic, i) => (
                  <li key={i} className={styles.tacticItem}>{tactic}</li>
                ))}
              </ul>
            </div>
            
            <div className={styles.examples}>
              <h4 className={styles.examplesTitle}>Примеры:</h4>
              <ul className={styles.examplesList}>
                {archetype.examples.map((example, i) => (
                  <li key={i} className={styles.exampleItem}>{example}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArchetypeDisplay;
