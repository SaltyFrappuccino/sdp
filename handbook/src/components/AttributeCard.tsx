import React from 'react';
import styles from './AttributeCard.module.css';
import { Attribute } from '@/data/combatSystemData';

interface AttributeCardProps {
  attribute: Attribute;
}

const AttributeCard: React.FC<AttributeCardProps> = ({ attribute }) => {
  return (
    <div className={styles.card}>
      <h4 className={styles.name}>{attribute.name}</h4>
      <p className={styles.description}>{attribute.description}</p>
      <div className={styles.mastery}>
        <strong>Мастер:</strong> {attribute.mastery}
      </div>
    </div>
  );
};

export default AttributeCard;
