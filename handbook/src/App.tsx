import { useState } from 'react';
import styles from './App.module.css';
import { combatSystemData } from '@/data/combatSystemData';
import { loreAndWorldData } from '@/data/loreAndWorldData';
import { characterBasicsData } from '@/data/characterBasicsData';
import ExpandedSidebar from '@/components/ExpandedSidebar';
import MobileMenu from '@/components/MobileMenu';
import Content from '@/components/Content';
import ThemeToggle from '@/components/ThemeToggle';
import AppBackground from '@/components/AppBackground';
import GlobalSearch from '@/components/GlobalSearch';
import BookmarksPanel from '@/components/BookmarksPanel';
import Breadcrumbs from '@/components/Breadcrumbs';
import ChapterNavigation from '@/components/ChapterNavigation';
import QuickLinks from '@/components/QuickLinks';
import { useTheme } from '@/hooks/useTheme';

type BookType = 'lore' | 'character' | 'combat';

const books = {
  lore: loreAndWorldData,
  character: characterBasicsData,
  combat: combatSystemData
};

function App() {
  const [selectedBook, setSelectedBook] = useState<BookType>('combat');
  const [selectedChapterId, setSelectedChapterId] = useState(books[selectedBook].sections[0].id);
  const [theme, toggleTheme] = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);

  const currentBook = books[selectedBook];
  const selectedChapter = currentBook.sections.find(c => c.id === selectedChapterId) || currentBook.sections[0];

  const handleBookChange = (bookType: BookType) => {
    setSelectedBook(bookType);
    setSelectedChapterId(books[bookType].sections[0].id);
  };

  const handleHeadingSelect = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGlobalSearchResult = (bookType: BookType, chapterId: string, headingId?: string) => {
    setSelectedBook(bookType);
    setSelectedChapterId(chapterId);
    if (headingId) {
      setTimeout(() => {
        const element = document.getElementById(headingId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleBookmarkClick = (bookType: BookType, chapterId: string, headingId?: string) => {
    setSelectedBook(bookType);
    setSelectedChapterId(chapterId);
    if (headingId) {
      setTimeout(() => {
        const element = document.getElementById(headingId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  return (
    <div className={styles.app}>
      <AppBackground />
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      
      {/* Глобальный поиск */}
      <GlobalSearch onResultClick={handleGlobalSearchResult} />
      
      {/* Панель закладок */}
      <BookmarksPanel 
        isVisible={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onBookmarkClick={handleBookmarkClick}
      />
      
      {/* Переключатель книг */}
      <div className={styles.bookSelector}>
        <button 
          className={`${styles.bookButton} ${selectedBook === 'lore' ? styles.active : ''}`}
          onClick={() => handleBookChange('lore')}
        >
          Лор и Мир
        </button>
        <button 
          className={`${styles.bookButton} ${selectedBook === 'character' ? styles.active : ''}`}
          onClick={() => handleBookChange('character')}
        >
          Основы Персонажа
        </button>
        <button 
          className={`${styles.bookButton} ${selectedBook === 'combat' ? styles.active : ''}`}
          onClick={() => handleBookChange('combat')}
        >
          Боевая Система
        </button>
        <button 
          className={styles.bookmarksButton}
          onClick={() => setShowBookmarks(true)}
          title="Показать закладки"
        >
          🔖
        </button>
      </div>
      
      {/* Десктопная версия */}
      <ExpandedSidebar
        chapters={currentBook.sections}
        selectedChapterId={selectedChapterId}
        setSelectedChapterId={setSelectedChapterId}
      />
      
      {/* Мобильная версия */}
      <MobileMenu
        chapters={currentBook.sections}
        selectedChapterId={selectedChapterId}
        onChapterSelect={setSelectedChapterId}
        onHeadingSelect={handleHeadingSelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      {/* Основной контент */}
      <div className={styles.contentWrapper}>
        <Breadcrumbs 
          bookType={selectedBook}
          chapterTitle={selectedChapter.title}
          onBookClick={handleBookChange}
        />
        
        <ChapterNavigation
          chapters={currentBook.sections}
          currentChapterId={selectedChapterId}
          onChapterChange={setSelectedChapterId}
        />
        
        <QuickLinks
          currentBookType={selectedBook}
          currentChapterId={selectedChapterId}
          onLinkClick={handleBookmarkClick}
        />
        
        <Content chapter={selectedChapter} bookType={selectedBook} />
      </div>
    </div>
  )
}

export default App
