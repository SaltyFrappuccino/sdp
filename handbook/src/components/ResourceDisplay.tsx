import React from 'react';
import styles from './ResourceDisplay.module.css';

interface Resource {
  name: string;
  type: 'zero' | 'minor' | 'major' | 'ultimate';
  budget: number;
  description: string;
  examples: string[];
  icon: string;
}

interface ResourceDisplayProps {
  resources: Resource[];
  title?: string;
}

const ResourceDisplay: React.FC<ResourceDisplayProps> = ({ resources, title }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'zero': return '#4CAF50';
      case 'minor': return '#2196F3';
      case 'major': return '#FF9800';
      case 'ultimate': return '#F44336';
      default: return '#451ecf';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'zero': return 'Нулевые';
      case 'minor': return 'Малые';
      case 'major': return 'Значительные';
      case 'ultimate': return 'Предельные';
      default: return type;
    }
  };

  return (
    <div className={styles.container}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.resourcesGrid}>
        {resources.map((resource, index) => (
          <div key={index} className={styles.resourceCard}>
            <div className={styles.resourceHeader}>
              <span className={styles.icon}>{resource.icon}</span>
              <div className={styles.resourceInfo}>
                <span className={styles.resourceName}>{resource.name}</span>
                <span 
                  className={styles.resourceType}
                  style={{ color: getTypeColor(resource.type) }}
                >
                  {getTypeLabel(resource.type)} Ячейки
                </span>
              </div>
              <div className={styles.budget}>
                <span className={styles.budgetLabel}>Бюджет:</span>
                <span className={styles.budgetValue}>{resource.budget}</span>
              </div>
            </div>
            
            <div className={styles.description}>
              {resource.description}
            </div>
            
            <div className={styles.examples}>
              <h4 className={styles.examplesTitle}>Примеры способностей:</h4>
              <ul className={styles.examplesList}>
                {resource.examples.map((example, i) => (
                  <li key={i} className={styles.exampleItem}>{example}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceDisplay;
