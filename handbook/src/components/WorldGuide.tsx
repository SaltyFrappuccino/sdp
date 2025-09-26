import React, { useState } from 'react';
import styles from './WorldGuide.module.css';
import VolumeStructure from './VolumeStructure';
import BookmarksPanel from './BookmarksPanel';
import { volumesData } from '../data/volumesData';

const WorldGuide: React.FC = () => {
  const [showBookmarks, setShowBookmarks] = useState(false);

  const handleBookmarkClick = (section: string) => {
    // Логика для обработки клика по закладке
    // Здесь можно добавить парсинг section для определения тома и главы
    setShowBookmarks(false);
  };

  return (
    <div className={styles.worldGuide}>
      <VolumeStructure volumes={volumesData} />

      <BookmarksPanel
        isVisible={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onBookmarkClick={handleBookmarkClick}
      />
    </div>
  );
};

export default WorldGuide;
