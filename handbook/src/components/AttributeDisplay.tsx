import React from 'react';
import styles from './AttributeDisplay.module.css';

interface Attribute {
  name: string;
  description: string;
  masterExample: string;
  icon?: string;
}

interface AttributeDisplayProps {
  attributes: Attribute[];
  title?: string;
}

const AttributeDisplay: React.FC<AttributeDisplayProps> = ({ attributes, title }) => {
  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.attributesGrid}>
        {attributes.map((attr, index) => (
          <div key={index} className={styles.attributeCard}>
            <div className={styles.attributeHeader}>
              {attr.icon && <span className={styles.icon}>{attr.icon}</span>}
              <span className={styles.attributeName}>[{attr.name}]</span>
            </div>
            <div className={styles.attributeDescription}>
              {attr.description}
            </div>
            <div className={styles.masterExample}>
              <strong>Мастер:</strong> {attr.masterExample}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttributeDisplay;
