import React, { useState } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = "Поиск по справочнику..." }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <span className={styles.icon}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className={styles.input}
        />
        {query && (
          <button 
            onClick={clearSearch}
            className={styles.clearButton}
            aria-label="Очистить поиск"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
