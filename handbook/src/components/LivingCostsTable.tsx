import React from 'react';
import styles from './LivingCostsTable.module.css';
import { LivingCost } from '../data/economyData';

interface LivingCostsTableProps {
  title: string;
  data: LivingCost[];
}

const LivingCostsTable: React.FC<LivingCostsTableProps> = ({ title, data }) => {
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, LivingCost[]>);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{title}</h3>
      {Object.entries(groupedData).map(([category, items]) => (
        <div key={category} className={styles.categorySection}>
          <h4 className={styles.categoryTitle}>{category}</h4>
          <div className={styles.costsList}>
            {items.map((item, index) => (
              <div key={index} className={styles.costItem}>
                <div className={styles.costDescription}>{item.description}</div>
                <div className={styles.costPrice}>{item.price}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LivingCostsTable;
