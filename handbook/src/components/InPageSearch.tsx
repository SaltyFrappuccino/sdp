import React, { useState, useEffect } from 'react';
import styles from './InPageSearch.module.css';

interface InPageSearchProps {
  onSearch: (query: string) => void;
  searchResults?: number;
}

const InPageSearch: React.FC<InPageSearchProps> = ({ onSearch, searchResults = 0 }) => {
  const [query, setQuery] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setIsVisible(true);
      }
      if (e.key === 'Escape') {
        setIsVisible(false);
        setQuery('');
        onSearch('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearch]);

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    setIsVisible(false);
  };

  if (!isVisible && !query) return null;

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <span className={styles.icon}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Поиск на странице... (Ctrl+F)"
          className={styles.input}
          autoFocus
        />
        {query && (
          <span className={styles.results}>
            {searchResults} найдено
          </span>
        )}
        <button 
          onClick={clearSearch}
          className={styles.closeButton}
          aria-label="Закрыть поиск"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default InPageSearch;
