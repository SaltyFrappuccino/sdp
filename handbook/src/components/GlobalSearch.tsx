import React, { useState, useEffect, useRef } from 'react';
import styles from './GlobalSearch.module.css';
import { loreAndWorldData } from '@/data/loreAndWorldData';
import { characterBasicsData } from '@/data/characterBasicsData';
import { combatSystemData } from '@/data/combatSystemData';

interface SearchResult {
  bookType: 'lore' | 'character' | 'combat';
  bookName: string;
  chapterId: string;
  chapterTitle: string;
  content: string;
  type: 'heading' | 'subheading' | 'paragraph' | 'list';
  index: number;
}

interface GlobalSearchProps {
  onResultClick: (bookType: 'lore' | 'character' | 'combat', chapterId: string, headingId?: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onResultClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const books = {
    lore: { data: loreAndWorldData, name: 'Лор и Мир' },
    character: { data: characterBasicsData, name: 'Основы Персонажа' },
    combat: { data: combatSystemData, name: 'Боевая Система' }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsVisible(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsVisible(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    Object.entries(books).forEach(([bookType, book]) => {
      book.data.sections.forEach(section => {
        section.content.forEach((item, index) => {
          let content = '';
          let type: SearchResult['type'] = 'paragraph';

          switch (item.type) {
            case 'heading':
              content = item.text;
              type = 'heading';
              break;
            case 'subheading':
              content = item.text;
              type = 'subheading';
              break;
            case 'paragraph':
              content = Array.isArray(item.items) ? item.items.join(' ') : item.text;
              type = 'paragraph';
              break;
            case 'list':
              content = item.items.join(' ');
              type = 'list';
              break;
            case 'attributes':
              content = item.items.map((attr: any) => `${attr.name}: ${attr.description}`).join(' ');
              break;
            case 'tagCosts':
              content = item.items.map((tag: any) => `${tag.name}: ${tag.cost}`).join(' ');
              break;
            case 'tagDescriptions':
              content = item.items.map((tag: any) => `${tag.name}: ${tag.description}`).join(' ');
              break;
            case 'budget':
              content = item.items.map((item: any) => `${item.name}: ${item.value}`).join(' ');
              break;
            case 'exceptions':
              content = item.items.join(' ');
              break;
            case 'dominionExamples':
              content = item.items.map((example: any) => `${example.name}: ${example.description}`).join(' ');
              break;
            case 'manifestationModes':
              content = item.items.map((mode: any) => `${mode.name}: ${mode.description}`).join(' ');
              break;
            case 'rankTable':
              content = `${item.title}: ${item.items.map((rank: any) => `${rank.rank}: ${rank.description}`).join(' ')}`;
              break;
            case 'archetypeList':
              content = `${item.title}: ${item.items.map((archetype: any) => `${archetype.name}: ${archetype.description}`).join(' ')}`;
              break;
            case 'synkiTypes':
              content = item.items.map((synki: any) => `${synki.name}: ${synki.description}`).join(' ');
              break;
          }

          if (content.toLowerCase().includes(searchTerm)) {
            searchResults.push({
              bookType: bookType as 'lore' | 'character' | 'combat',
              bookName: book.name,
              chapterId: section.id,
              chapterTitle: section.title,
              content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
              type,
              index
            });
          }
        });
      });
    });

    setResults(searchResults.slice(0, 20)); // Ограничиваем результаты
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          const result = results[selectedIndex];
          onResultClick(result.bookType, result.chapterId, `heading-${result.index}`);
          setIsVisible(false);
          setQuery('');
          setResults([]);
        }
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result.bookType, result.chapterId, `heading-${result.index}`);
    setIsVisible(false);
    setQuery('');
    setResults([]);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'heading': return '📖';
      case 'subheading': return '📄';
      case 'list': return '📋';
      default: return '📝';
    }
  };

  if (!isVisible && !query) return null;

  return (
    <div className={styles.overlay} onClick={() => setIsVisible(false)}>
      <div className={styles.searchContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchBox}>
          <span className={styles.icon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск по всем книгам... (Ctrl+K)"
            className={styles.input}
            autoFocus
          />
          <span className={styles.shortcut}>Ctrl+K</span>
        </div>
        
        {results.length > 0 && (
          <div ref={resultsRef} className={styles.results}>
            {results.map((result, index) => (
              <div
                key={`${result.bookType}-${result.chapterId}-${result.index}`}
                className={`${styles.result} ${index === selectedIndex ? styles.selected : ''}`}
                onClick={() => handleResultClick(result)}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.typeIcon}>{getTypeIcon(result.type)}</span>
                  <span className={styles.bookName}>{result.bookName}</span>
                  <span className={styles.chapterTitle}>{result.chapterTitle}</span>
                </div>
                <div className={styles.resultContent}>
                  {result.content}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {query && results.length === 0 && (
          <div className={styles.noResults}>
            Ничего не найдено по запросу "{query}"
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
