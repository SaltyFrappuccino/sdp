import React from 'react';
import styles from './ManifestationModes.module.css';

interface ManifestationMode {
  name: string;
  description?: string;
  concept?: string;
  passive?: string;
  example?: string | {
    creature: string;
    description: string;
    passive_example: string;
  };
}

interface ManifestationModesProps {
  items: ManifestationMode[];
}

const ManifestationModes: React.FC<ManifestationModesProps> = ({ items }) => {
  return (
    <div className={styles.container}>
      {items.map((mode, index) => (
        <div key={index} className={styles.card}>
          <h4 className={styles.name}>{mode.name}</h4>
          
          {mode.concept && (
            <div className={styles.section}>
              <strong>Концепция:</strong> {mode.concept}
            </div>
          )}
          
          {mode.description && (
            <div className={styles.section}>
              <strong>Описание:</strong> {mode.description}
            </div>
          )}
          
          {mode.passive && (
            <div className={styles.section}>
              <strong>Пассивный эффект:</strong> {mode.passive}
            </div>
          )}
          
          {mode.example && (
            <div className={styles.example}>
              {typeof mode.example === 'string' ? (
                <div>
                  <strong>Пример:</strong> {mode.example}
                </div>
              ) : (
                <div>
                  <div className={styles.exampleTitle}>
                    <strong>Пример: {mode.example.creature}</strong>
                  </div>
                  <div className={styles.exampleDescription}>
                    {mode.example.description}
                  </div>
                  <div className={styles.examplePassive}>
                    <strong>Эффект:</strong> {mode.example.passive_example}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ManifestationModes;
