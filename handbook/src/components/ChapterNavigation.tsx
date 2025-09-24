import React from 'react';
import styles from './ChapterNavigation.module.css';

interface Chapter {
  id: string;
  title: string;
}

interface ChapterNavigationProps {
  chapters: Chapter[];
  currentChapterId: string;
  onChapterChange: (chapterId: string) => void;
}

const ChapterNavigation: React.FC<ChapterNavigationProps> = ({ 
  chapters, 
  currentChapterId, 
  onChapterChange 
}) => {
  const currentIndex = chapters.findIndex(chapter => chapter.id === currentChapterId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < chapters.length - 1;

  const goToPrevious = () => {
    if (hasPrevious) {
      onChapterChange(chapters[currentIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      onChapterChange(chapters[currentIndex + 1].id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className={styles.navigation}>
      <button
        className={`${styles.navButton} ${styles.previous} ${!hasPrevious ? styles.disabled : ''}`}
        onClick={goToPrevious}
        onKeyDown={(e) => handleKeyDown(e, goToPrevious)}
        disabled={!hasPrevious}
        title={hasPrevious ? `Предыдущая: ${chapters[currentIndex - 1]?.title}` : 'Нет предыдущей главы'}
        aria-label={hasPrevious ? `Перейти к предыдущей главе: ${chapters[currentIndex - 1]?.title}` : 'Нет предыдущей главы'}
      >
        <span className={styles.icon}>←</span>
        <span className={styles.text}>
          <span className={styles.label}>Предыдущая</span>
          {hasPrevious && (
            <span className={styles.chapterTitle}>
              {chapters[currentIndex - 1].title}
            </span>
          )}
        </span>
      </button>

      <div className={styles.progress}>
        <span className={styles.current}>
          {currentIndex + 1} из {chapters.length}
        </span>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${((currentIndex + 1) / chapters.length) * 100}%` }}
          />
        </div>
      </div>

      <button
        className={`${styles.navButton} ${styles.next} ${!hasNext ? styles.disabled : ''}`}
        onClick={goToNext}
        onKeyDown={(e) => handleKeyDown(e, goToNext)}
        disabled={!hasNext}
        title={hasNext ? `Следующая: ${chapters[currentIndex + 1]?.title}` : 'Нет следующей главы'}
        aria-label={hasNext ? `Перейти к следующей главе: ${chapters[currentIndex + 1]?.title}` : 'Нет следующей главы'}
      >
        <span className={styles.text}>
          <span className={styles.label}>Следующая</span>
          {hasNext && (
            <span className={styles.chapterTitle}>
              {chapters[currentIndex + 1].title}
            </span>
          )}
        </span>
        <span className={styles.icon}>→</span>
      </button>
    </div>
  );
};

export default ChapterNavigation;
