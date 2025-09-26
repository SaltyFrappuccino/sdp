import { useState } from 'react';
import styles from './App.module.css';
import ThemeToggle from '@/components/ThemeToggle';
import AppBackground from '@/components/AppBackground';
import WorldGuide from '@/components/WorldGuide';
import { useTheme } from '@/hooks/useTheme';

function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <div className={styles.app}>
      <AppBackground />
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      <WorldGuide />
    </div>
  )
}

export default App
