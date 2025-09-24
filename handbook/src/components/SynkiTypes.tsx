import React from 'react';
import styles from './SynkiTypes.module.css';

interface SynkiType {
  name: string;
  description: string;
  mechanics: string;
  examples: string[];
}

interface SynkiTypesProps {
  items: SynkiType[];
}

const SynkiTypes: React.FC<SynkiTypesProps> = ({ items }) => {
  return (
    <div className={styles.container}>
      {items.map((synki, index) => (
        <div key={index} className={styles.card}>
          <h4 className={styles.name}>{synki.name}</h4>
          <div className={styles.description}>
            <strong>Описание:</strong> {synki.description}
          </div>
          <div className={styles.mechanics}>
            <strong>Игровые механики:</strong> {synki.mechanics}
          </div>
          {synki.examples.length > 0 && (
            <div className={styles.examples}>
              <strong>Примеры:</strong>
              <ul>
                {synki.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SynkiTypes;

