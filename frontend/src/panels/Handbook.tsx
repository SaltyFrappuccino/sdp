import React, { useState, useEffect, useRef } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Cell,
  Search,
  Div,
  Spinner,
  Accordion,
  Title,
  IconButton,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import ReactMarkdown from 'react-markdown';
import { Icon28ArrowUpOutline } from '@vkontakte/icons';

interface NavIdProps {
  id: string;
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
  children: TOCItem[];
}

const STORAGE_KEY = 'handbook_scroll_position';

export const Handbook: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [markdownContent, setMarkdownContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Отслеживание скролла для кнопки "Вверх"
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Загрузка markdown файла
  useEffect(() => {
    fetch('/Основная Статья.md')
      .then((response) => response.text())
      .then((text) => {
        // Очищаем markdown от якорей в тексте
        const cleanedText = text.replace(/<a name="[^"]+"><\/a>,?\s*/g, '');
        setMarkdownContent(cleanedText);
        setLoading(false);
        
        // Парсим оглавление из оригинального текста (с якорями)
        const tocItems = parseTableOfContents(text);
        setToc(tocItems);
        
        // Восстанавливаем позицию скролла
        const savedPosition = localStorage.getItem(STORAGE_KEY);
        if (savedPosition) {
          setTimeout(() => {
            const element = document.getElementById(savedPosition);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              setActiveSection(savedPosition);
            }
          }, 300);
        }
      })
      .catch((error) => {
        console.error('Ошибка загрузки справочника:', error);
        setLoading(false);
      });
  }, []);

  // Парсинг оглавления из markdown с правильной иерархией
  const parseTableOfContents = (content: string): TOCItem[] => {
    const lines = content.split('\n');
    const flatItems: TOCItem[] = [];
    let currentSection = '';

    lines.forEach((line) => {
      // Определяем разделы (### Раздел)
      const sectionMatch = line.match(/^###\s+Раздел\s+([IV]+):\s+(.+)$/);
      if (sectionMatch) {
        currentSection = `Раздел ${sectionMatch[1]}: ${sectionMatch[2]}`;
        const anchorMatch = line.match(/<a name="([^"]+)"><\/a>/);
        const anchorId = anchorMatch ? anchorMatch[1] : slugify(currentSection);
        
        flatItems.push({
          id: anchorId,
          title: currentSection,
          level: 1, // Разделы - уровень 1
          children: [],
        });
        return;
      }

      // Определяем главы внутри разделов (### или #### с якорем главы)
      const chapterMatch = line.match(/^(#{3,4})\s+(<a name="глава-[^"]+"><\/a>,?\s*)?(.+)$/);
      if (chapterMatch && !line.includes('Навигация:') && !line.includes('Раздел')) {
        let title = chapterMatch[3];
        const anchorMatch = line.match(/<a name="([^"]+)"><\/a>/);
        let anchorId = '';
        
        if (anchorMatch) {
          anchorId = anchorMatch[1];
          title = title.replace(/<a name="[^"]+"><\/a>,?\s*/, '').trim();
        } else {
          anchorId = slugify(title);
        }

        const level = chapterMatch[1].length;
        
        flatItems.push({
          id: anchorId,
          title,
          level: level === 3 ? 2 : 3, // Главы - уровень 2, подглавы - уровень 3
          children: [],
        });
        return;
      }

      // Определяем подразделы (##### и ######)
      const subsectionMatch = line.match(/^(#{5,6})\s+(.+)$/);
      if (subsectionMatch) {
        let title = subsectionMatch[2];
        const anchorMatch = line.match(/<a name="([^"]+)"><\/a>/);
        let anchorId = '';
        
        if (anchorMatch) {
          anchorId = anchorMatch[1];
          title = title.replace(/<a name="[^"]+"><\/a>,?\s*/, '').trim();
        } else {
          anchorId = slugify(title);
        }

        flatItems.push({
          id: anchorId,
          title,
          level: 4, // Подразделы - уровень 4
          children: [],
        });
      }
    });

    // Строим иерархию
    return buildHierarchy(flatItems);
  };

  // Построение иерархической структуры
  const buildHierarchy = (items: TOCItem[]): TOCItem[] => {
    const root: TOCItem[] = [];
    const stack: TOCItem[] = [];

    items.forEach((item) => {
      const newItem = { ...item, children: [] };

      // Убираем из стека все элементы того же или более высокого уровня
      while (stack.length > 0 && stack[stack.length - 1].level >= newItem.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Это элемент верхнего уровня (Раздел)
        root.push(newItem);
      } else {
        // Добавляем как дочерний к последнему в стеке
        stack[stack.length - 1].children.push(newItem);
      }

      stack.push(newItem);
    });

    return root;
  };

  // Создание slug из заголовка
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\wа-яё\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  // Фильтрация контента по поисковому запросу
  const getFilteredContent = () => {
    if (!searchQuery.trim()) return markdownContent;

    const lines = markdownContent.split('\n');
    const filtered: string[] = [];
    let includeSection = false;
    let currentSection: string[] = [];

    lines.forEach((line) => {
      // Начало новой секции (заголовок)
      if (line.match(/^#{1,6}\s+/)) {
        // Сохраняем предыдущую секцию если она подходит
        if (includeSection && currentSection.length > 0) {
          filtered.push(...currentSection, '---', '');
        }
        currentSection = [line];
        includeSection = line.toLowerCase().includes(searchQuery.toLowerCase());
      } else {
        currentSection.push(line);
        if (line.toLowerCase().includes(searchQuery.toLowerCase())) {
          includeSection = true;
        }
      }
    });

    // Добавляем последнюю секцию
    if (includeSection && currentSection.length > 0) {
      filtered.push(...currentSection);
    }

    return filtered.length > 0 ? filtered.join('\n') : '# Ничего не найдено\n\nПопробуйте изменить поисковый запрос.';
  };

  // Переход к секции
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      localStorage.setItem(STORAGE_KEY, sectionId);
    }
  };

  // Экспортируемая функция для программного перехода к разделу
  // Может быть вызвана из других компонентов через navigateToHandbookSection
  useEffect(() => {
    // Проверяем, есть ли сохраненная позиция для перехода
    const targetSection = localStorage.getItem('handbook_target_section');
    if (targetSection && !loading) {
      setTimeout(() => {
        scrollToSection(targetSection);
        localStorage.removeItem('handbook_target_section');
      }, 500);
    }
  }, [loading]);

  // Прокрутка вверх
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Рендер элемента оглавления (рекурсивный)
  const renderTOCItem = (item: TOCItem, depth: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeSection === item.id;

    if (hasChildren) {
      // Элемент с детьми - используем Accordion
      return (
        <div key={item.id} style={{ marginLeft: depth > 0 ? `${depth * 8}px` : '0' }}>
          <Accordion>
            <Accordion.Summary>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToSection(item.id);
                }}
                style={{
                  fontWeight: 'bold',
                  fontSize: depth === 0 ? '16px' : depth === 1 ? '15px' : '14px',
                  color: isActive ? 'var(--vkui--color_text_accent)' : undefined,
                  cursor: 'pointer',
                }}
              >
                {item.title}
          </div>
            </Accordion.Summary>
            <Accordion.Content>
              {item.children.map((child) => renderTOCItem(child, depth + 1))}
            </Accordion.Content>
          </Accordion>
        </div>
      );
    } else {
      // Элемент без детей - обычная ячейка
      return (
        <Cell
          key={item.id}
          onClick={() => scrollToSection(item.id)}
          style={{
            paddingLeft: `${depth * 16 + 12}px`,
            cursor: 'pointer',
            backgroundColor: isActive ? 'var(--vkui--color_background_accent_themed)' : undefined,
            fontWeight: isActive ? 'bold' : 'normal',
            fontSize: depth > 2 ? '13px' : '14px',
          }}
        >
          {item.title}
        </Cell>
      );
    }
  };

  // Кастомный рендерер для заголовков с якорями
  const renderHeading = ({ level, children }: any) => {
    const text = String(children);
    const anchorId = slugify(text);

    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

    const styles: React.CSSProperties = {
      scrollMarginTop: '80px',
      marginTop: level === 1 ? '32px' : level === 2 ? '28px' : level === 3 ? '24px' : level === 4 ? '20px' : '16px',
      marginBottom: level <= 3 ? '16px' : '12px',
      fontWeight: 'bold',
      fontSize: level === 1 ? '32px' : level === 2 ? '28px' : level === 3 ? '24px' : level === 4 ? '20px' : level === 5 ? '18px' : '16px',
    };

    return (
      <HeadingTag id={anchorId} style={styles}>
        {text}
      </HeadingTag>
    );
  };

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
          Справочник
        </PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Spinner size="m" />
        </Div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        Справочник
      </PanelHeader>
      
      <Group>
          <Search
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по справочнику..."
        />
      </Group>

      {!searchQuery && (
        <Group header={<Title level="2" style={{ padding: '12px 16px' }}>📑 Оглавление</Title>}>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {toc.map((item) => renderTOCItem(item, 0))}
            </div>
        </Group>
      )}

      <Group>
        <Div
          getRootRef={contentRef}
          style={{
            padding: '16px',
            lineHeight: '1.7',
          }}
          className="markdown-content"
        >
          <ReactMarkdown
            components={{
              h1: renderHeading,
              h2: renderHeading,
              h3: renderHeading,
              h4: renderHeading,
              h5: renderHeading,
              h6: renderHeading,
              // Стилизация таблиц с поддержкой GFM
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', margin: '20px 0' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid var(--vkui--color_separator_primary)',
                      fontSize: '14px',
                    }}
                  >
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead style={{ backgroundColor: 'var(--vkui--color_background_secondary)' }}>
                  {children}
                </thead>
              ),
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr>{children}</tr>,
              th: ({ children, style, ...props }) => (
                <th
                  {...props}
                  style={{
                    padding: '12px 8px',
                    borderBottom: '2px solid var(--vkui--color_separator_primary)',
                    border: '1px solid var(--vkui--color_separator_primary)',
                    textAlign: 'left',
                    fontWeight: 'bold',
                    ...style,
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children, style, ...props }) => (
                <td
                  {...props}
                  style={{
                    padding: '10px 8px',
                    border: '1px solid var(--vkui--color_separator_primary)',
                    ...style,
                  }}
                >
                  {children}
                </td>
              ),
              // Стилизация кода
              code: ({ inline, children }: any) =>
                inline ? (
                  <code
                    style={{
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      fontFamily: 'monospace',
                    }}
                  >
                    {children}
                  </code>
                ) : (
                  <pre
                    style={{
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      padding: '16px',
                      borderRadius: '8px',
                      overflow: 'auto',
                      margin: '16px 0',
                      fontSize: '14px',
                      lineHeight: '1.5',
                    }}
                  >
                    <code style={{ fontFamily: 'monospace' }}>{children}</code>
                  </pre>
                ),
              // Стилизация списков
              ul: ({ children }) => (
                <ul style={{ paddingLeft: '24px', margin: '12px 0' }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ paddingLeft: '24px', margin: '12px 0' }}>{children}</ol>
              ),
              li: ({ children }) => <li style={{ marginBottom: '6px' }}>{children}</li>,
              // Стилизация параграфов
              p: ({ children }) => <p style={{ margin: '12px 0', lineHeight: '1.7' }}>{children}</p>,
              // Стилизация цитат
              blockquote: ({ children }) => (
                <blockquote
                  style={{
                    borderLeft: '4px solid var(--vkui--color_accent_blue)',
                    paddingLeft: '16px',
                    margin: '20px 0',
                    fontStyle: 'italic',
                    color: 'var(--vkui--color_text_secondary)',
                  }}
                >
                  {children}
                </blockquote>
              ),
              // Горизонтальная линия
              hr: () => (
                <hr
                          style={{ 
                    border: 'none',
                    borderTop: '2px solid var(--vkui--color_separator_primary)',
                    margin: '32px 0',
                  }}
                />
              ),
              // Жирный текст
              strong: ({ children }) => (
                <strong style={{ fontWeight: 'bold' }}>{children}</strong>
              ),
              // Курсив
              em: ({ children }) => (
                <em style={{ fontStyle: 'italic' }}>{children}</em>
              ),
            }}
          >
            {getFilteredContent()}
          </ReactMarkdown>
        </Div>
      </Group>

      {/* Кнопка "Вверх" */}
      {showScrollTop && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={scrollToTop}
            style={{
              backgroundColor: 'var(--vkui--color_background_accent)',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <Icon28ArrowUpOutline fill="var(--vkui--color_icon_contrast)" />
          </IconButton>
        </div>
      )}

      <style>{`
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          font-weight: bold;
          color: var(--vkui--color_text_primary);
        }
        
        .markdown-content h1 {
          font-size: 32px;
          border-bottom: 2px solid var(--vkui--color_separator_primary);
          padding-bottom: 8px;
        }
        
        .markdown-content h2 {
          font-size: 28px;
          border-bottom: 1px solid var(--vkui--color_separator_primary);
          padding-bottom: 6px;
        }
        
        .markdown-content h3 {
          font-size: 24px;
        }
        
        .markdown-content h4 {
          font-size: 20px;
        }
        
        .markdown-content h5 {
          font-size: 18px;
        }
        
        .markdown-content h6 {
          font-size: 16px;
        }
        
        .markdown-content a {
          color: var(--vkui--color_accent_blue);
          text-decoration: none;
        }
        
        .markdown-content a:hover {
          text-decoration: underline;
        }
      `}</style>
    </Panel>
  );
};
