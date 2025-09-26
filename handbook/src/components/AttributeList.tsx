import React from 'react';
import styles from './AttributeList.module.css';

interface Attribute {
  name: string;
  description: string;
  mastery: string;
  icon?: string;
}

interface AttributeListProps {
  attributes: Attribute[];
  title?: string;
}

const AttributeList: React.FC<AttributeListProps> = ({ attributes, title }) => {
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
            <div className={styles.masteryExample}>
              <strong>Мастер:</strong> {attr.mastery}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttributeList;
