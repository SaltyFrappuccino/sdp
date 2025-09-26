import React from 'react';
import styles from './SynkiCard.module.css';

interface SynkiExample {
  name: string;
  rank: string;
  description: string;
}

interface SynkiType {
  name: string;
  description: string;
  features: string[];
  examples: SynkiExample[];
  economicRole: string;
  icon: string;
}

interface SynkiCardProps {
  synkiType: SynkiType;
}

const SynkiCard: React.FC<SynkiCardProps> = ({ synkiType }) => {
  return (
    <div className={styles.synkiCard}>
      <div className={styles.synkiHeader}>
        <span className={styles.icon}>{synkiType.icon}</span>
        <h3 className={styles.synkiName}>{synkiType.name}</h3>
      </div>
      
      <div className={styles.synkiDescription}>
        {synkiType.description}
      </div>
      
      <div className={styles.features}>
        <h4>Особенности:</h4>
        <ul className={styles.featuresList}>
          {synkiType.features.map((feature, index) => (
            <li key={index}>{feature}</li>
          ))}
        </ul>
      </div>
      
      <div className={styles.examples}>
        <h4>Примеры:</h4>
        <div className={styles.examplesList}>
          {synkiType.examples.map((example, index) => (
            <div key={index} className={styles.example}>
              <div className={styles.exampleHeader}>
                <span className={styles.exampleName}>"{example.name}"</span>
                <span className={styles.exampleRank}>({example.rank}-ранг)</span>
              </div>
              <p className={styles.exampleDescription}>{example.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.economicRole}>
        <h4>Экономическая роль:</h4>
        <p>{synkiType.economicRole}</p>
      </div>
    </div>
  );
};

export default SynkiCard;
