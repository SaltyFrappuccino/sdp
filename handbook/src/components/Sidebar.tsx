import React, { useState } from 'react';
import styles from './Sidebar.module.css';
import { Chapter } from '@/data/combatSystemData';
import SearchBar from '@/components/SearchBar';

interface SidebarProps {
  chapters: Chapter[];
  selectedChapterId: string;
  setSelectedChapterId: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chapters, selectedChapterId, setSelectedChapterId }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>⚔️ Боевая Система</h2>
        <SearchBar onSearch={handleSearch} placeholder="Поиск глав..." />
      </div>
      <nav className={styles.nav}>
        {filteredChapters.map(chapter => (
          <button
            key={chapter.id}
            className={`${styles.navItem} ${selectedChapterId === chapter.id ? styles.active : ''}`}
            onClick={() => setSelectedChapterId(chapter.id)}
          >
            {chapter.title}
          </button>
        ))}
        {filteredChapters.length === 0 && searchQuery && (
          <div className={styles.noResults}>
            Ничего не найдено для "{searchQuery}"
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;