import { useState } from 'react';
import styles from './App.module.css';
import { combatSystemData } from '@/data/combatSystemData';
import ExpandedSidebar from '@/components/ExpandedSidebar';
import MobileMenu from '@/components/MobileMenu';
import Content from '@/components/Content';
import ThemeToggle from '@/components/ThemeToggle';
import AppBackground from '@/components/AppBackground';
import { useTheme } from '@/hooks/useTheme';

function App() {
  const [selectedChapterId, setSelectedChapterId] = useState(combatSystemData.chapters[0].id);
  const [theme, toggleTheme] = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const selectedChapter = combatSystemData.chapters.find(c => c.id === selectedChapterId) || combatSystemData.chapters[0];

  const handleHeadingSelect = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.app}>
      <AppBackground />
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      
      {/* Десктопная версия */}
      <ExpandedSidebar
        chapters={combatSystemData.chapters}
        selectedChapterId={selectedChapterId}
        setSelectedChapterId={setSelectedChapterId}
      />
      
      {/* Мобильная версия */}
      <MobileMenu
        chapters={combatSystemData.chapters}
        selectedChapterId={selectedChapterId}
        onChapterSelect={setSelectedChapterId}
        onHeadingSelect={handleHeadingSelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <Content chapter={selectedChapter} />
    </div>
  )
}

export default App
