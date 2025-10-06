import React, { useState, useEffect } from 'react';
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
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import ReactMarkdown from 'react-markdown';

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

  // Загрузка markdown файла
  useEffect(() => {
    fetch('/Основная Статья.md')
      .then((response) => response.text())
      .then((text) => {
        // Очищаем markdown от якорей в тексте
        const cleanedText = text.replace(/<a name="[^"]+"><\/a>/g, '');
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

  // Парсинг оглавления из markdown
  const parseTableOfContents = (content: string): TOCItem[] => {
    const lines = content.split('\n');
    const flatItems: TOCItem[] = [];

    lines.forEach((line) => {
      // Ищем заголовки (от ### до ######, игнорируем # и ##)
      const match = line.match(/^(#{3,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        let title = match[2];
        
        // Извлекаем ID из якоря
        const anchorMatch = line.match(/<a name="([^"]+)"><\/a>/);
        let anchorId = '';
        
        if (anchorMatch) {
          anchorId = anchorMatch[1];
          // Удаляем якорь из заголовка
          title = title.replace(/<a name="[^"]+"><\/a>,?/, '').trim();
        } else {
          // Создаем slug из заголовка
          anchorId = slugify(title);
        }

        flatItems.push({
          id: anchorId,
          title,
          level,
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
        // Это элемент верхнего уровня
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

  // Рендер элемента оглавления (рекурсивный)
  const renderTOCItem = (item: TOCItem, depth: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeSection === item.id;

    if (hasChildren) {
      // Элемент с детьми - используем Accordion
      return (
        <div key={item.id} style={{ marginLeft: `${depth * 8}px` }}>
          <Accordion>
            <Accordion.Summary>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToSection(item.id);
                }}
                style={{
                  fontWeight: isActive ? 'bold' : depth === 0 ? '600' : 'normal',
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
            fontSize: depth > 2 ? '14px' : '15px',
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
      fontWeight: level <= 3 ? 'bold' : level === 4 ? '600' : '500',
      fontSize: level === 1 ? '28px' : level === 2 ? '24px' : level === 3 ? '20px' : level === 4 ? '18px' : level === 5 ? '16px' : '14px',
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
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {toc.map((item) => renderTOCItem(item, 0))}
            </div>
        </Group>
      )}

      <Group>
        <Div
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
              // Стилизация таблиц
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
              th: ({ children }) => (
                <th
                  style={{
                    padding: '12px 8px',
                    borderBottom: '2px solid var(--vkui--color_separator_primary)',
                    border: '1px solid var(--vkui--color_separator_primary)',
                    textAlign: 'left',
                    fontWeight: 'bold',
                  }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  style={{
                    padding: '10px 8px',
                    border: '1px solid var(--vkui--color_separator_primary)',
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

      <style>{`
        .markdown-content h1 {
          font-size: 28px;
          font-weight: bold;
          color: var(--vkui--color_text_primary);
          border-bottom: 2px solid var(--vkui--color_separator_primary);
          padding-bottom: 8px;
        }
        .markdown-content h2 {
          font-size: 24px;
          font-weight: bold;
          color: var(--vkui--color_text_primary);
          border-bottom: 1px solid var(--vkui--color_separator_primary);
          padding-bottom: 6px;
        }
        .markdown-content h3 {
          font-size: 20px;
          font-weight: bold;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h4 {
          font-size: 18px;
          font-weight: 600;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h5 {
          font-size: 16px;
          font-weight: 500;
          color: var(--vkui--color_text_primary);
        }
        .markdown-content h6 {
          font-size: 14px;
          font-weight: 500;
          color: var(--vkui--color_text_secondary);
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
