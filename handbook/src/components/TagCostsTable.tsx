import React from 'react';
import styles from './TagCostsTable.module.css';
import { TagCost } from '@/data/combatSystemData';

interface TagCostsTableProps {
  items: TagCost[];
}

const TagCostsTable: React.FC<TagCostsTableProps> = ({ items }) => {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ранг Тега</th>
            <th>Стоимость в Очках</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.rank}>
              <td data-label="Ранг Тега" className={styles.rank}>{item.rank}</td>
              <td data-label="Стоимость в Очках">{item.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TagCostsTable;
