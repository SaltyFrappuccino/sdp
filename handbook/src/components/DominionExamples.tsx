import React from 'react';
import styles from './DominionExamples.module.css';

interface DominionExample {
  creature: string;
  dominion: string;
  law: string;
}

interface DominionExamplesProps {
  items: DominionExample[];
}

const DominionExamples: React.FC<DominionExamplesProps> = ({ items }) => {
  return (
    <div className={styles.container}>
      {items.map((example, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.header}>
            <h4 className={styles.creature}>{example.creature}</h4>
            <div className={styles.dominion}>"{example.dominion}"</div>
          </div>
          <div className={styles.law}>
            <strong>Закон:</strong> {example.law}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DominionExamples;
