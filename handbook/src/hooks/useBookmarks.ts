import { useState, useEffect } from 'react';

export interface Bookmark {
  id: string;
  title: string;
  section: string;
  timestamp: number;
}

const BOOKMARKS_KEY = 'world-guide-bookmarks';

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Загружаем закладки из localStorage при инициализации
  useEffect(() => {
    const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (error) {
        console.error('Error loading bookmarks:', error);
        setBookmarks([]);
      }
    }
  }, []);

  // Сохраняем закладки в localStorage при изменении
  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const addBookmark = (section: string, title: string) => {
    const newBookmark: Bookmark = {
      id: `${section}-${Date.now()}`,
      title,
      section,
      timestamp: Date.now()
    };

    setBookmarks(prev => {
      // Проверяем, нет ли уже такой закладки
      const exists = prev.some(bookmark => 
        bookmark.section === section && bookmark.title === title
      );
      
      if (exists) {
        return prev;
      }
      
      return [...prev, newBookmark].sort((a, b) => b.timestamp - a.timestamp);
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  };

  const isBookmarked = (section: string, title: string) => {
    return bookmarks.some(bookmark => 
      bookmark.section === section && bookmark.title === title
    );
  };

  const clearAllBookmarks = () => {
    setBookmarks([]);
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    clearAllBookmarks
  };
};
