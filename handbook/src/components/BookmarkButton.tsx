import React from 'react';
import styles from './BookmarkButton.module.css';
import { useBookmarks } from '../hooks/useBookmarks';

interface BookmarkButtonProps {
  section: string;
  title: string;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ section, title }) => {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  
  const bookmarked = isBookmarked(section, title);

  const handleClick = () => {
    if (bookmarked) {
      // Находим закладку и удаляем её
      const bookmarkId = `${section}-${title}`;
      removeBookmark(bookmarkId);
    } else {
      addBookmark(section, title);
    }
  };

  return (
    <button 
      className={`${styles.bookmarkButton} ${bookmarked ? styles.bookmarked : ''}`}
      onClick={handleClick}
      title={bookmarked ? 'Удалить из закладок' : 'Добавить в закладки'}
    >
      {bookmarked ? '⭐' : '☆'}
    </button>
  );
};

export default BookmarkButton;