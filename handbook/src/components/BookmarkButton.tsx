import React, { useState, useEffect } from 'react';
import styles from './BookmarkButton.module.css';

interface BookmarkButtonProps {
  bookType: 'lore' | 'character' | 'combat';
  chapterId: string;
  headingId?: string;
  title: string;
}

interface Bookmark {
  id: string;
  bookType: 'lore' | 'character' | 'combat';
  chapterId: string;
  headingId?: string;
  title: string;
  timestamp: number;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ 
  bookType, 
  chapterId, 
  headingId, 
  title 
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const bookmarkId = `${bookType}-${chapterId}${headingId ? `-${headingId}` : ''}`;

  useEffect(() => {
    const bookmarks = getBookmarks();
    setIsBookmarked(bookmarks.some(b => b.id === bookmarkId));
  }, [bookmarkId]);

  const getBookmarks = (): Bookmark[] => {
    const stored = localStorage.getItem('handbook-bookmarks');
    return stored ? JSON.parse(stored) : [];
  };

  const saveBookmarks = (bookmarks: Bookmark[]) => {
    localStorage.setItem('handbook-bookmarks', JSON.stringify(bookmarks));
  };

  const toggleBookmark = () => {
    const bookmarks = getBookmarks();
    const existingIndex = bookmarks.findIndex(b => b.id === bookmarkId);

    if (existingIndex >= 0) {
      // Удаляем закладку
      bookmarks.splice(existingIndex, 1);
      setIsBookmarked(false);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    } else {
      // Добавляем закладку
      const newBookmark: Bookmark = {
        id: bookmarkId,
        bookType,
        chapterId,
        headingId,
        title,
        timestamp: Date.now()
      };
      bookmarks.push(newBookmark);
      setIsBookmarked(true);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    }

    saveBookmarks(bookmarks);
  };

  return (
    <div className={styles.container}>
      <button
        className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
        onClick={toggleBookmark}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={isBookmarked ? 'Удалить из закладок' : 'Добавить в закладки'}
        title={isBookmarked ? 'Удалить из закладок' : 'Добавить в закладки'}
      >
        {isBookmarked ? '🔖' : '📌'}
      </button>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          {isBookmarked ? 'Удалено из закладок' : 'Добавлено в закладки'}
        </div>
      )}
    </div>
  );
};

export default BookmarkButton;
