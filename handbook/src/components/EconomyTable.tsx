import React from 'react';
import styles from './EconomyTable.module.css';

interface EconomyRow {
  rank: string;
  questReward: string;
  gateReward: string;
}

interface EconomyTableProps {
  title: string;
  headers: string[];
  rows: EconomyRow[];
}

const EconomyTable: React.FC<EconomyTableProps> = ({ title, headers, rows }) => {
  return (
    <div className={styles.tableContainer}>
      <h3 className={styles.tableTitle}>{title}</h3>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map((header, index) => (
                <th key={index} className={styles.headerCell}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className={styles.dataRow}>
                <td className={styles.dataCell}>
                  <span className={styles.rank}>{row.rank}</span>
                </td>
                <td className={styles.dataCell}>{row.questReward}</td>
                <td className={styles.dataCell}>{row.gateReward}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EconomyTable;
