import React, { useState } from 'react';
import styles from './ExpandedSidebar.module.css';
import { Chapter } from '@/data/combatSystemData';
import SearchBar from '@/components/SearchBar';

interface SectionItem {
  id: string;
  title: string;
  type: 'heading' | 'subheading';
}

interface ExpandedSidebarProps {
  chapters: Chapter[];
  selectedChapterId: string;
  setSelectedChapterId: (id: string) => void;
}

const ExpandedSidebar: React.FC<ExpandedSidebarProps> = ({ 
  chapters, 
  selectedChapterId, 
  setSelectedChapterId 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set([selectedChapterId]));

  // Генерируем содержание для каждой главы
  const getChapterSections = (chapter: Chapter): SectionItem[] => {
    const sections: SectionItem[] = [];
    
    chapter.content.forEach((item: any, index: number) => {
      if (item.type === 'heading') {
        sections.push({
          id: `heading-${index}`,
          title: item.text,
          type: 'heading'
        });
      } else if (item.type === 'subheading') {
        sections.push({
          id: `subheading-${index}`,
          title: item.text,
          type: 'subheading'
        });
      }
    });
    
    return sections;
  };

  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getChapterSections(chapter).some(section => 
      section.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleChapterClick = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    if (!expandedChapters.has(chapterId)) {
      setExpandedChapters(prev => new Set([...prev, chapterId]));
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>📚 Справочник по Миру</h2>
        <SearchBar onSearch={handleSearch} placeholder="Поиск по содержанию..." />
      </div>
      
      <nav className={styles.nav}>
        {filteredChapters.map(chapter => {
          const sections = getChapterSections(chapter);
          const isExpanded = expandedChapters.has(chapter.id);
          const isSelected = selectedChapterId === chapter.id;

          return (
            <div key={chapter.id} className={styles.chapterGroup}>
              <div className={styles.chapterHeader}>
                <button
                  className={`${styles.chapterButton} ${isSelected ? styles.active : ''}`}
                  onClick={() => handleChapterClick(chapter.id)}
                >
                  {chapter.title}
                </button>
                {sections.length > 0 && (
                  <button
                    className={styles.expandButton}
                    onClick={() => toggleChapter(chapter.id)}
                    aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                )}
              </div>
              
              {isExpanded && sections.length > 0 && (
                <div className={styles.sections}>
                  {sections.map(section => (
                    <button
                      key={section.id}
                      className={`${styles.sectionButton} ${styles[section.type]}`}
                      onClick={() => scrollToSection(section.id)}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {filteredChapters.length === 0 && searchQuery && (
          <div className={styles.noResults}>
            Ничего не найдено для "{searchQuery}"
          </div>
        )}
      </nav>
    </aside>
  );
};

export default ExpandedSidebar;
