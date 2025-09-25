import React from 'react';
import styles from './GiftDisplay.module.css';

interface Gift {
  name: string;
  description: string;
  icon: string;
  effects: string[];
}

interface GiftDisplayProps {
  gifts: Gift[];
  title?: string;
}

const GiftDisplay: React.FC<GiftDisplayProps> = ({ gifts, title }) => {
  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.giftsGrid}>
        {gifts.map((gift, index) => (
          <div key={index} className={styles.giftCard}>
            <div className={styles.giftHeader}>
              <span className={styles.icon}>{gift.icon}</span>
              <span className={styles.giftName}>{gift.name}</span>
            </div>
            
            <div className={styles.description}>
              {gift.description}
            </div>
            
            <div className={styles.effects}>
              <h4 className={styles.effectsTitle}>Эффекты:</h4>
              <ul className={styles.effectsList}>
                {gift.effects.map((effect, i) => (
                  <li key={i} className={styles.effectItem}>{effect}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GiftDisplay;
