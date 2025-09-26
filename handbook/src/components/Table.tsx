import React from 'react';
import styles from './Table.module.css';

interface TableProps {
  title?: string;
  headers: string[];
  rows: string[][];
}

const Table: React.FC<TableProps> = ({ title, headers, rows }) => {
  return (
    <div className={styles.tableContainer}>
      {title && <h4 className={styles.tableTitle}>{title}</h4>}
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
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={styles.dataRow}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={styles.dataCell}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
