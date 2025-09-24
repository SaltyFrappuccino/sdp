import React, { useState } from 'react';
import { Chapter } from '@/data/combatSystemData';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  chapters: Chapter[];
  selectedChapterId: string;
  onChapterSelect: (chapterId: string) => void;
  onHeadingSelect: (headingId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  chapters,
  selectedChapterId,
  onChapterSelect,
  onHeadingSelect,
  searchQuery,
  onSearchChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleChapterClick = (chapterId: string) => {
    onChapterSelect(chapterId);
    setIsOpen(false);
  };

  const handleHeadingClick = (headingId: string) => {
    onHeadingSelect(headingId);
    setIsOpen(false);
  };

  const getHeadings = (chapter: Chapter) => {
    const headings: { id: string; text: string; level: number }[] = [];
    
    chapter.content.forEach((item, index) => {
      if (item.type === 'heading') {
        headings.push({
          id: `heading-${index}`,
          text: item.text,
          level: 1
        });
      } else if (item.type === 'subheading') {
        headings.push({
          id: `subheading-${index}`,
          text: item.text,
          level: 2
        });
      }
    });
    
    return headings;
  };

  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.content.some(item => 
      (item.type === 'heading' || item.type === 'subheading') &&
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <>
      {/* Гамбургер кнопка */}
      <button 
        className={`${styles.hamburger} ${isOpen ? styles.open : ''}`}
        onClick={toggleMenu}
        aria-label="Открыть меню"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className={styles.overlay} onClick={toggleMenu} />
      )}

      {/* Мобильное меню */}
      <div className={`${styles.mobileMenu} ${isOpen ? styles.open : ''}`}>
        <div className={styles.menuHeader}>
          <h2 className={styles.menuTitle}>📚 Справочник по Миру</h2>
          <button 
            className={styles.closeButton}
            onClick={toggleMenu}
            aria-label="Закрыть меню"
          >
            ✕
          </button>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 Поиск по содержанию..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.menuContent}>
          {filteredChapters.length === 0 ? (
            <div className={styles.noResults}>
              Ничего не найдено
            </div>
          ) : (
            <nav className={styles.nav}>
              {filteredChapters.map((chapter) => {
                const isExpanded = expandedChapters.has(chapter.id);
                const headings = getHeadings(chapter);
                
                return (
                  <div key={chapter.id} className={styles.chapterGroup}>
                    <div className={styles.chapterHeader}>
                      <button
                        className={`${styles.chapterButton} ${
                          selectedChapterId === chapter.id ? styles.active : ''
                        }`}
                        onClick={() => handleChapterClick(chapter.id)}
                      >
                        {chapter.title}
                      </button>
                      {headings.length > 0 && (
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleChapter(chapter.id)}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      )}
                    </div>
                    
                    {isExpanded && headings.length > 0 && (
                      <div className={styles.sections}>
                        {headings.map((heading) => (
                          <button
                            key={heading.id}
                            className={`${styles.sectionButton} ${
                              heading.level === 1 ? styles.heading : styles.subheading
                            }`}
                            onClick={() => handleHeadingClick(heading.id)}
                          >
                            {heading.text}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
