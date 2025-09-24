import React, { useEffect, useState } from 'react';
import styles from './TableOfContents.module.css';

interface TocItem {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  chapter: any;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ chapter }) => {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Генерируем TOC из заголовков в контенте
    const items: TocItem[] = [];
    
    chapter.content.forEach((item: any, index: number) => {
      if (item.type === 'heading') {
        const id = `heading-${index}`;
        items.push({
          id,
          title: item.text,
          level: 2
        });
      } else if (item.type === 'subheading') {
        const id = `subheading-${index}`;
        items.push({
          id,
          title: item.text,
          level: 3
        });
      }
    });

    setTocItems(items);
  }, [chapter]);

  useEffect(() => {
    // Отслеживаем активный раздел при скролле
    const handleScroll = () => {
      const headings = tocItems.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading && heading.offsetTop <= scrollPosition) {
          setActiveId(tocItems[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (tocItems.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📖 Содержание</h3>
      <nav className={styles.nav}>
        {tocItems.map(item => (
          <button
            key={item.id}
            className={`${styles.item} ${styles[`level-${item.level}`]} ${
              activeId === item.id ? styles.active : ''
            }`}
            onClick={() => scrollToHeading(item.id)}
          >
            {item.title}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TableOfContents;
