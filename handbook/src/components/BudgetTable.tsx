import React from 'react';
import styles from './BudgetTable.module.css';

interface BudgetItem {
  name: string;
  budget: string;
  maxRank: string;
}

interface BudgetTableProps {
  items: BudgetItem[];
}

const BudgetTable: React.FC<BudgetTableProps> = ({ items }) => {
  return (
    <div className={styles.container}>
      {items.map(item => (
        <div key={item.name} className={styles.card}>
          <h4 className={styles.name}>{item.name}</h4>
          <div className={styles.details}>
            <p><strong>Бюджет Мощи:</strong> {item.budget}</p>
            <p><strong>Макс. Ранг Тега:</strong> <span className={styles.rank}>{item.maxRank}</span></p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BudgetTable;
