import React from 'react';
import styles from './MechanicCard.module.css';

interface MechanicFeature {
  name: string;
  description: string;
}

interface MechanicExample {
  name: string;
  description: string;
}

interface Mechanic {
  title: string;
  description: string;
  features?: MechanicFeature[];
  examples?: MechanicExample[];
  icon: string;
}

interface MechanicCardProps {
  mechanic: Mechanic;
}

const MechanicCard: React.FC<MechanicCardProps> = ({ mechanic }) => {
  return (
    <div className={styles.mechanicCard}>
      <div className={styles.mechanicHeader}>
        <span className={styles.icon}>{mechanic.icon}</span>
        <h3 className={styles.mechanicTitle}>{mechanic.title}</h3>
      </div>
      
      <div className={styles.mechanicDescription}>
        {mechanic.description}
      </div>
      
      {mechanic.features && (
        <div className={styles.features}>
          <h4>Особенности:</h4>
          <div className={styles.featuresList}>
            {mechanic.features.map((feature, index) => (
              <div key={index} className={styles.feature}>
                <span className={styles.featureName}>{feature.name}:</span>
                <span className={styles.featureDescription}>{feature.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {mechanic.examples && (
        <div className={styles.examples}>
          <h4>Примеры:</h4>
          <div className={styles.examplesList}>
            {mechanic.examples.map((example, index) => (
              <div key={index} className={styles.example}>
                <span className={styles.exampleName}>"{example.name}"</span>
                <p className={styles.exampleDescription}>{example.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MechanicCard;
