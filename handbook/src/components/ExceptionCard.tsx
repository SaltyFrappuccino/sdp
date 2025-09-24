import React from 'react';
import styles from './ExceptionCard.module.css';

interface Exception {
  name: string;
  description: string;
  example: string;
}

interface ExceptionCardProps {
  items: Exception[];
}

const ExceptionCard: React.FC<ExceptionCardProps> = ({ items }) => {
  return (
    <div className={styles.container}>
      {items.map(item => (
        <div key={item.name} className={styles.card}>
          <h4 className={styles.name}>{item.name}</h4>
          <p className={styles.description}>{item.description}</p>
          <div className={styles.example}>
            <p><strong>Пример:</strong> {item.example}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExceptionCard;
