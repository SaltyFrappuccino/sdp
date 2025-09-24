import React from 'react';
import styles from './ImageDisplay.module.css';

interface ImageDisplayProps {
  src: string;
  alt?: string;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ src, alt }) => {
  return (
    <div className={styles.container}>
      <div className={styles.placeholder}>
        <div className={styles.icon}>🖼️</div>
        <p className={styles.text}>{src}</p>
        {alt && <p className={styles.alt}>{alt}</p>}
      </div>
    </div>
  );
};

export default ImageDisplay;
