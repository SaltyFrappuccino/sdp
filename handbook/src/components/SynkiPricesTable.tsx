import React from 'react';
import styles from './SynkiPricesTable.module.css';
import { SynkiPriceRow } from '../data/economyData';

interface SynkiPricesTableProps {
  title: string;
  data: SynkiPriceRow[];
}

const SynkiPricesTable: React.FC<SynkiPricesTableProps> = ({ title, data }) => {
  return (
    <div className={styles.tableContainer}>
      <h3 className={styles.tableTitle}>{title}</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.headerCell}>Ранг</th>
              <th className={styles.headerCell}>Осколок</th>
              <th className={styles.headerCell}>Эхо</th>
              <th className={styles.headerCell}>Фокус</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className={styles.dataRow}>
                <td className={styles.dataCell}>
                  <span className={styles.rank}>{row.rank}</span>
                </td>
                <td className={styles.dataCell}>{row.oskolok}</td>
                <td className={styles.dataCell}>{row.echo}</td>
                <td className={styles.dataCell}>{row.focus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SynkiPricesTable;
