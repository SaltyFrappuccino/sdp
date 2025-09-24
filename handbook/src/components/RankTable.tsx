import React from 'react';
import styles from './RankTable.module.css';

interface RankData {
  rank: string;
  malye: string | number;
  znachitelnye: string | number;
  predelnye: string | number;
  description?: string;
}

interface RankTableProps {
  items: RankData[];
  title?: string;
}

const RankTable: React.FC<RankTableProps> = ({ items, title }) => {
  return (
    <div className={styles.container}>
      {title && <h4 className={styles.title}>{title}</h4>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ранг</th>
              <th>Малые Ячейки (I)</th>
              <th>Значительные Ячейки (II)</th>
              <th>Предельные Ячейки (III)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className={styles.row}>
                <td className={styles.rank}>{item.rank}</td>
                <td className={styles.number}>{item.malye}</td>
                <td className={styles.number}>{item.znachitelnye}</td>
                <td className={styles.number}>{item.predelnye}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankTable;

