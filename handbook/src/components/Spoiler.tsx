import React, { useState } from 'react';
import styles from './Spoiler.module.css';
import Content from './Content';

interface SpoilerProps {
  title: string;
  content: any[];
}

const Spoiler: React.FC<SpoilerProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSpoiler = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.spoiler}>
      <button 
        className={`${styles.spoilerButton} ${isOpen ? styles.open : ''}`}
        onClick={toggleSpoiler}
        aria-expanded={isOpen}
      >
        <span className={styles.spoilerTitle}>{title}</span>
        <span className={styles.spoilerIcon}>
          {isOpen ? '▼' : '▶'}
        </span>
      </button>
      
      {isOpen && (
        <div className={styles.spoilerContent}>
          {content.map((item, index) => (
            <Content 
              key={index} 
              chapter={{ id: '', title: '', content: [item] }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Spoiler;
