import React from 'react';
import styles from './TagDescriptionCard.module.css';
import { TagDescription } from '@/data/combatSystemData';

interface TagDescriptionCardProps {
  tag: TagDescription;
}

const TagDescriptionCard: React.FC<TagDescriptionCardProps> = ({ tag }) => {
  const getRankColor = (rank: string) => {
    const rankColors: { [key: string]: string } = {
      F: '#a0a0a0',
      E: '#8fbc8f',
      D: '#6495ed',
      C: '#ffa07a',
      B: '#f08080',
      A: '#ff6347',
      S: '#ff4500',
      SS: '#d73400',
      SSS: '#a50000',
    };
    return rankColors[rank] || '#a0a0a0';
  };
  
  return (
    <div className={styles.card}>
      <h3 className={styles.name}>{tag.name}</h3>
      <ul className={styles.rankList}>
        {tag.ranks.map((r: any) => (
          <li key={r.rank} className={styles.rankItem}>
            <span 
              className={styles.rankLabel} 
              style={{ backgroundColor: getRankColor(r.rank) }}
            >
              {r.rank}
            </span>
            <p className={styles.rankDescription}>{r.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TagDescriptionCard;
