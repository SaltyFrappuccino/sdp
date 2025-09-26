import React from 'react';
import styles from './LoreSection.module.css';
import { LoreSection as LoreSectionType } from '../data/loreData';

interface LoreSectionProps {
  section: LoreSectionType;
}

const LoreSection: React.FC<LoreSectionProps> = ({ section }) => {
  return (
    <div className={styles.loreSection}>
      <h3 className={styles.sectionTitle}>{section.title}</h3>
      <div className={styles.sectionContent}>
        {section.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
};

export default LoreSection;
