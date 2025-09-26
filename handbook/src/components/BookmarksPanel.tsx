import React from 'react';
import styles from './BookmarksPanel.module.css';
import { useBookmarks, type Bookmark } from '../hooks/useBookmarks';

interface BookmarksPanelProps {
  isVisible: boolean;
  onClose: () => void;
  onBookmarkClick: (section: string) => void;
}

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({ 
  isVisible, 
  onClose, 
  onBookmarkClick 
}) => {
  const { bookmarks, removeBookmark, clearAllBookmarks } = useBookmarks();

  const handleBookmarkClick = (bookmark: Bookmark) => {
    onBookmarkClick(bookmark.section);
    onClose();
  };

  const handleRemoveBookmark = (e: React.MouseEvent, bookmarkId: string) => {
    e.stopPropagation();
    removeBookmark(bookmarkId);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Закладки</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className={styles.content}>
          {bookmarks.length === 0 ? (
            <div className={styles.emptyState}>
              <p>У вас пока нет закладок</p>
              <p className={styles.hint}>Нажмите на ⭐ рядом с заголовком, чтобы добавить закладку</p>
            </div>
          ) : (
            <>
              <div className={styles.actions}>
                <button 
                  className={styles.clearButton}
                  onClick={clearAllBookmarks}
                >
                  Очистить все
                </button>
              </div>
              
              <div className={styles.bookmarksList}>
                {bookmarks.map((bookmark) => (
                  <div 
                    key={bookmark.id}
                    className={styles.bookmarkItem}
                    onClick={() => handleBookmarkClick(bookmark)}
                  >
                    <div className={styles.bookmarkContent}>
                      <div className={styles.bookmarkTitle}>{bookmark.title}</div>
                      <div className={styles.bookmarkSection}>{bookmark.section}</div>
                    </div>
                    <button 
                      className={styles.removeButton}
                      onClick={(e) => handleRemoveBookmark(e, bookmark.id)}
                    >
                      ✕
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