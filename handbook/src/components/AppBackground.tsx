import React from 'react';
import styles from './AppBackground.module.css';

const AppBackground: React.FC = () => {
  return (
    <div className={styles.background}>
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>
      <div className={styles.orb3}></div>
    </div>
  );
};

export default AppBackground;
