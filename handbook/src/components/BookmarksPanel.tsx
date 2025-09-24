import React, { useState, useEffect } from 'react';
import styles from './BookmarksPanel.module.css';

interface Bookmark {
  id: string;
  bookType: 'lore' | 'character' | 'combat';
  chapterId: string;
  headingId?: string;
  title: string;
  timestamp: number;
}

interface BookmarksPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onBookmarkClick: (bookType: 'lore' | 'character' | 'combat', chapterId: string, headingId?: string) => void;
}

const bookNames = {
  lore: 'Лор и Мир',
  character: 'Основы Персонажа',
  combat: 'Боевая Система'
};

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({ isVisible, onClose, onBookmarkClick }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    if (isVisible) {
      loadBookmarks();
    }
  }, [isVisible]);

  const loadBookmarks = () => {
    const stored = localStorage.getItem('handbook-bookmarks');
    const bookmarks = stored ? JSON.parse(stored) : [];
    setBookmarks(bookmarks.sort((a: Bookmark, b: Bookmark) => b.timestamp - a.timestamp));
  };

  const removeBookmark = (bookmarkId: string) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    setBookmarks(updatedBookmarks);
    localStorage.setItem('handbook-bookmarks', JSON.stringify(updatedBookmarks));
  };

  const clearAllBookmarks = () => {
    if (window.confirm('Удалить все закладки?')) {
      setBookmarks([]);
      localStorage.removeItem('handbook-bookmarks');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.icon}>🔖</span>
            Закладки
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {bookmarks.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📌</div>
              <p>Пока нет закладок</p>
              <small>Добавляйте закладки к важным разделам, нажимая на кнопку закладки</small>
            </div>
          ) : (
            <>
              <div className={styles.actions}>
                <span className={styles.count}>{bookmarks.length} закладок</span>
                <button 
                  className={styles.clearButton}
                  onClick={clearAllBookmarks}
                  title="Удалить все закладки"
                >
                  Очистить все
                </button>
              </div>
              
              <div className={styles.bookmarksList}>
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className={styles.bookmarkItem}>
                    <div 
                      className={styles.bookmarkContent}
                      onClick={() => {
                        onBookmarkClick(bookmark.bookType, bookmark.chapterId, bookmark.headingId);
                        onClose();
                      }}
                    >
                      <div className={styles.bookmarkHeader}>
                        <span className={styles.bookName}>
                          {bookNames[bookmark.bookType]}
                        </span>
                        <span className={styles.timestamp}>
                          {formatDate(bookmark.timestamp)}
                        </span>
                      </div>
                      <div className={styles.bookmarkTitle}>
                        {bookmark.title}
                      </div>
                    </div>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeBookmark(bookmark.id)}
                      title="Удалить закладку"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookmarksPanel;
